import { spawn } from "node:child_process";
import { mkdir, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".heic", ".heif"]);

const options = parseArgs(process.argv.slice(2));
const rootDir = path.resolve(options.root || ".");
const fullDir = path.resolve(options.full || path.join(rootDir, "img", "full"));
const thumbDir = path.resolve(options.thumb || path.join(rootDir, "img", "thumb"));
const jsonPath = path.resolve(options.json || path.join(rootDir, "images.json"));
const width = String(options.width || 800);
const quality = String(options.quality || 82);

if (options.help) {
  printHelp();
  process.exit(0);
}

const imageMagickCommand = await findImageMagickCommand();
await mkdir(thumbDir, { recursive: true });

const files = (await readdir(fullDir, { withFileTypes: true }))
  .filter((entry) => entry.isFile())
  .map((entry) => entry.name)
  .filter((name) => IMAGE_EXTENSIONS.has(path.extname(name).toLowerCase()))
  .sort((a, b) => a.localeCompare(b, "zh-Hans-CN"));

if (files.length === 0) {
  throw new Error(`No images found in ${fullDir}`);
}

for (const file of files) {
  const source = path.join(fullDir, file);
  const target = path.join(thumbDir, file);

  await run(imageMagickCommand, [
    source,
    "-auto-orient",
    "-resize",
    `${width}x`,
    "-quality",
    quality,
    target
  ]);

  console.log(`thumb: ${path.relative(rootDir, target)}`);
}

const images = files.map((file) => ({
  src: `full/${file}`,
  thumb: `thumb/${file}`,
  alt: "",
  position: "center center"
}));

await writeFile(jsonPath, `${JSON.stringify({ images }, null, 2)}\n`, "utf8");

console.log(`images.json: ${jsonPath}`);
console.log(`done: ${files.length} image(s)`);

function parseArgs(args) {
  const parsed = {};

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];

    if (arg === "--help" || arg === "-h") {
      parsed.help = true;
      continue;
    }

    if (!arg.startsWith("--")) {
      throw new Error(`Unknown argument: ${arg}`);
    }

    const key = arg.slice(2);
    const value = args[i + 1];

    if (!value || value.startsWith("--")) {
      throw new Error(`Missing value for ${arg}`);
    }

    parsed[key] = value;
    i += 1;
  }

  return parsed;
}

async function findImageMagickCommand() {
  try {
    await run("magick", ["-version"], { silent: true });
    return "magick";
  } catch {
    try {
      await run("convert", ["-version"], { silent: true });
      return "convert";
    } catch {
      throw new Error("ImageMagick is required. Install it first, then make sure the `magick` or `convert` command is available.");
    }
  }
}

function run(command, args, runOptions = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: runOptions.silent ? "ignore" : "inherit" });

    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} exited with code ${code}`));
    });
  });
}

function printHelp() {
  console.log(`Usage:
  npm run photos -- --root /var/guyue/s.guyue.me/starstill

Options:
  --root     Root directory containing img/full. Default: current directory
  --full     Source full-size image directory. Default: <root>/img/full
  --thumb    Thumbnail output directory. Default: <root>/img/thumb
  --json     images.json output path. Default: <root>/images.json
  --width    Thumbnail width in pixels. Default: 800
  --quality  Thumbnail quality. Default: 82
`);
}
