const obfuscator = require("javascript-obfuscator");
const fs = require("fs");

fs.writeFileSync("./dist-obfuscated/index.js", obfuscator.obfuscate(fs.readFileSync("./dist/index.js", "utf-8"), {
  compact:true,
  controlFlowFlattening: true,
  controlFlowFlatteningThreshold: 0.75,
  deadCodeInjection: true,
  deadCodeInjectionThreshold: 0.4,
  disableConsoleOutput: true,
  identifierNamesGenerator: "hexadecimal",
  numbersToExpressions: true,
  reservedNames: [
    "axios",
    "moment-timezone",
    "uuid"
  ],
  reservedStrings: [
    "axios",
    "moment-timezone",
    "uuid"
  ],
  rotateStringArray: true,
  splitStrings: true,
  splitStringsChunkLength: 10,
  stringArray: true,
  stringArrayCallsTransform: true,
  stringArrayCallsTransformThreshold: 0.75,
  stringArrayEncoding: ["rc4"],
  stringArrayIndexesType: ["hexadecimal-number", "hexadecimal-numeric-string"],
  stringArrayIndexShift: true,
  stringArrayRotate: true,
  stringArrayShuffle: true,
  stringArrayThreshold: 1,
  target: "node",
  unicodeEscapeSequence: true,
  transformObjectKeys: true
}).getObfuscatedCode());

fs.copyFileSync("./dist/index.d.ts", "./dist-obfuscated/index.d.ts");