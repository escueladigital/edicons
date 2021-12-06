const fs = require("fs").promises;
const camelcase = require("camelcase");
const { promisify } = require("util");
const rimraf = promisify(require("rimraf"));
const { transform } = require("@svgr/core");
const babel = require("@babel/core");

const reactTransform = async (svg, componentName, format) => {
  let component = await transform(svg, {}, { componentName });
  let { code } = await babel.transformAsync(component, {
    plugins: [
      [require("@babel/plugin-transform-react-jsx"), { useBuiltIns: true }],
    ],
  });

  if (format === "esm") {
    return code;
  }

  return code
    .replace('import * as React from "react"', 'const React = require("react")')
    .replace("export default", "module.exports =");
};

const getIcons = async (style) => {
  const files = await fs.readdir(`./optimized/${style}`);
  return Promise.all(
    files.map(async (file) => ({
      svg: await fs.readFile(`./optimized/${style}/${file}`, "utf8"),
      componentName: `${camelcase(file.replace(/\.svg$/, ""), {
        pascalCase: true,
      })}Icon`,
    }))
  );
};

const exportAll = (icons, format, includeExtension = true) => {
  return icons
    .map(({ componentName }) => {
      let extension = includeExtension ? ".js" : "";
      if (format === "esm") {
        return `export { default as ${componentName} } from './${componentName}${extension}'`;
      }
      return `module.exports.${componentName} = require("./${componentName}${extension}")`;
    })
    .join("\n");
};

const buildIcons = async (style, format) => {
  let outDir = `./dist/${style}`;
  if (format === "esm") {
    outDir += "/esm";
  }

  await fs.mkdir(outDir, { recursive: true });

  let icons = await getIcons(style);

  await Promise.all(
    icons.flatMap(async ({ componentName, svg }) => {
      let content = await reactTransform(svg, componentName, format);
      let types = `import * as React from 'react';\ndeclare function ${componentName}(props: React.ComponentProps<'svg'>): JSX.Element;\nexport default ${componentName};\n`;

      return [
        fs.writeFile(`${outDir}/${componentName}.js`, content, "utf8"),
        ...(types
          ? [fs.writeFile(`${outDir}/${componentName}.d.ts`, types, "utf8")]
          : []),
      ];
    })
  );

  await fs.writeFile(`${outDir}/index.js`, exportAll(icons, format), "utf8");

  await fs.writeFile(
    `${outDir}/index.d.ts`,
    exportAll(icons, "esm", false),
    "utf8"
  );
};

function main() {
  Promise.all([rimraf(`./dist/outline/*`), rimraf(`./dist/solid/*`)]).then(() =>
    Promise.all([
      buildIcons("solid", "esm"),
      buildIcons("solid", "cjs"),
      buildIcons("outline", "esm"),
      buildIcons("outline", "cjs"),
      fs.writeFile(
        `./dist/outline/package.json`,
        `{"module": "./esm/index.js"}`,
        "utf8"
      ),
      fs.writeFile(
        `./dist/outline/esm/package.json`,
        `{"type": "module"}`,
        "utf8"
      ),
      fs.writeFile(
        `./dist/solid/package.json`,
        `{"module": "./esm/index.js"}`,
        "utf8"
      ),
      fs.writeFile(
        `./dist/solid/esm/package.json`,
        `{"type": "module"}`,
        "utf8"
      ),
    ])
  );
}

main();
