const { exec } = require("child_process")
const fs = require("fs")
const path = require("path")
const { v4: uuidv4 } = require("uuid")

const TEMP_DIR = path.join(__dirname, "../temp")

if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true })
}

const cleanupFile = (filePath) => {
  try {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
  } catch (e) {}
}

const executeCode = async (req, res) => {
  const { code, language } = req.body

  if (!code || !language) {
    return res.status(400).json({ message: "Code and language are required" })
  }

  const id = uuidv4()
  let filePath = ""
  let command = ""
  let extraFiles = []

  try {
    switch (language) {
      case "javascript": {
        filePath = path.join(TEMP_DIR, `${id}.js`)
        fs.writeFileSync(filePath, code)
        command = `node "${filePath}"`
        break
      }

      case "typescript": {
        filePath = path.join(TEMP_DIR, `${id}.ts`)
        fs.writeFileSync(filePath, code)
        command = `npx ts-node "${filePath}"`
        break
      }

      case "python": {
        filePath = path.join(TEMP_DIR, `${id}.py`)
        fs.writeFileSync(filePath, code)
        command = `python3 "${filePath}"`
        break
      }

      case "java": {
        const classMatch = code.match(/public\s+class\s+(\w+)/)
        const className = classMatch ? classMatch[1] : "Main"
        filePath = path.join(TEMP_DIR, `${className}_${id}.java`)
        const javaFile = path.join(TEMP_DIR, `${className}.java`)
        fs.writeFileSync(javaFile, code)
        const classFile = path.join(TEMP_DIR, `${className}.class`)
        extraFiles = [javaFile, classFile]
        command = `cd "${TEMP_DIR}" && javac "${javaFile}" && java -cp "${TEMP_DIR}" ${className}`
        filePath = javaFile
        break
      }

      case "cpp": {
        filePath = path.join(TEMP_DIR, `${id}.cpp`)
        const outFile = path.join(TEMP_DIR, `${id}.out`)
        fs.writeFileSync(filePath, code)
        extraFiles = [outFile]
        command = `g++ "${filePath}" -o "${outFile}" && "${outFile}"`
        break
      }

      case "html": {
        return res.json({ output: code, isHtml: true })
      }

      default:
        return res.status(400).json({ message: `Unsupported language ${language}` })
    }

    exec(command, { timeout: 10000 }, (error, stdout, stderr) => {
      cleanupFile(filePath)
      extraFiles.forEach(cleanupFile)

      if (error && error.killed) {
        return res.status(408).json({ output: "Execution timed out 10s limit" })
      }

      const output = stdout || stderr || (error ? error.message : "")
      return res.json({ output: output || "no output" })
    })
  } catch (err) {
    cleanupFile(filePath)
    extraFiles.forEach(cleanupFile)
    console.error("Execute error", err)
    res.status(500).json({ message: "Server error during execution" })
  }
}

module.exports = { executeCode }