const { exec } = require("child_process")
const fs = require("fs")
const path = require("path")
const { v4: uuidv4 } = require("uuid")

const TEMP_DIR = path.join(__dirname, "../temp")
fs.mkdirSync(TEMP_DIR, { recursive: true })

const isWin = process.platform === "win32"

// Use an explicit shell so a wrong ComSpec setting can't break execution
const SHELL = isWin ? "cmd.exe" : "/bin/sh"

// Full path to the node that runs this server (doesn't depend on PATH)
const NODE = `"${process.execPath}"`

// Node 22.18+ can run .ts files directly; older versions use tsx
const [nodeMajor, nodeMinor] = process.versions.node.split(".").map(Number)
const nodeRunsTs = nodeMajor > 22 || (nodeMajor === 22 && nodeMinor >= 18)

const removeDir = (dir) => {
  try {
    fs.rmSync(dir, { recursive: true, force: true })
  } catch (e) {}
}

const executeCode = async (req, res) => {
  const { code, language } = req.body || {}

  if (!code || !language) {
    return res.status(400).json({ message: "Code and language are required" })
  }

  if (language === "html") {
    return res.json({ output: code, isHtml: true })
  }

  // Every run gets its own folder, so two runs never overwrite each other
  const runDir = path.join(TEMP_DIR, uuidv4())
  let command = ""

  try {
    fs.mkdirSync(runDir, { recursive: true })

    switch (language) {
      case "javascript":
        fs.writeFileSync(path.join(runDir, "main.js"), code)
        command = `${NODE} main.js`
        break

      case "typescript":
        fs.writeFileSync(path.join(runDir, "main.ts"), code)
        command = nodeRunsTs ? `${NODE} main.ts` : "npx --yes tsx main.ts"
        break

      case "python":
        fs.writeFileSync(path.join(runDir, "main.py"), code)
        command = `${isWin ? "python" : "python3"} main.py`
        break

      case "java": {
        const match = code.match(/public\s+class\s+(\w+)/)
        const className = match ? match[1] : "Main"
        fs.writeFileSync(path.join(runDir, `${className}.java`), code)
        command = `javac ${className}.java && java -cp . ${className}`
        break
      }

      case "cpp": {
        fs.writeFileSync(path.join(runDir, "main.cpp"), code)
        command = isWin
          ? "g++ main.cpp -o main.exe && main.exe"
          : "g++ main.cpp -o main.out && ./main.out"
        break
      }

      default:
        removeDir(runDir)
        return res.status(400).json({ message: `Unsupported language ${language}` })
    }

    exec(
      command,
      { cwd: runDir, timeout: 10000, maxBuffer: 1024 * 1024, shell: SHELL },
      (error, stdout, stderr) => {
        removeDir(runDir)

        if (error && error.killed) {
          return res.json({ output: "Execution timed out (10s limit)" })
        }

        const output =
          [stdout, stderr].filter(Boolean).join("\n") ||
          (error ? error.message : "")
        return res.json({ output: output || "no output" })
      }
    )
  } catch (err) {
    removeDir(runDir)
    console.error("Execute error", err)
    res.status(500).json({ message: "Server error during execution" })
  }
}

module.exports = { executeCode }