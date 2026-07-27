import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import YAML from 'yaml';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_OPENAPI_VERSION = '3.0.1';
const DEFAULT_OPENAPI_TITLE = 'Shoyu API';
const DEFAULT_OPENAPI_API_VERSION = '1.0.0';
const DEFAULT_SECURITY_ENABLED = 'true';

const PWD_PATH = path.join(__dirname);
const ROOT_PATH = path.join(__dirname, '..');
const HANDLERS_PATH = path.join(ROOT_PATH, 'src', 'handlers');
const DIST_OPENAPI_PATH = path.join(PWD_PATH, 'openapi.yaml');

function parseCSVList(value) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function getOpenApiVersion() {
  return process.env.OPENAPI_VERSION ?? DEFAULT_OPENAPI_VERSION;
}

function getOpenApiTitle() {
  return process.env.OPENAPI_TITLE ?? DEFAULT_OPENAPI_TITLE;
}

function getOpenApiApiVersion() {
  return process.env.OPENAPI_API_VERSION ?? DEFAULT_OPENAPI_API_VERSION;
}

function isSecurityEnabled() {
  return (process.env.OPENAPI_SECURITY_ENABLED ?? DEFAULT_SECURITY_ENABLED).toLowerCase() === 'true';
}

function getServerUrls() {
  const fallbackPort = process.env.SERVER_PORT ?? '3000';
  const fallbackServer = `http://localhost:${fallbackPort}`;

  return parseCSVList(process.env.OPENAPI_SERVERS ?? fallbackServer);
}

function parseYAMLFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return YAML.parse(content, { logLevel: 'error' });
  } catch (error) {
    console.error('[ERROR]', `Error parsing YAML file ${filePath}:`, error);
    throw error;
  }
}

function writeYAMLToFile(filePath, content) {
  fs.writeFileSync(filePath, YAML.stringify(content), 'utf8');
  console.log('[SUCCESS]', `File written: ${filePath}`);
}

function getAllYamlFiles(dir) {
  try {
    if (!fs.existsSync(dir)) {
      console.warn('[WARN]', `Directory does not exist: ${dir}`);
      return [];
    }

    const files = [];
    const dirContent = fs.readdirSync(dir);

    for (const file of dirContent) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);

      if (stat.isDirectory()) {
        files.push(...getAllYamlFiles(filePath));
      } else if (filePath.endsWith('.yaml') || filePath.endsWith('.yml')) {
        files.push(filePath);
      }
    }

    return files;
  } catch (error) {
    console.error('[ERROR]', `Error reading YAML files from ${dir}:`, error);
    return [];
  }
}

function mergeObjects(target = {}, source = {}) {
  return { ...target, ...source };
}

function processOpenAPIFiles(files) {
  let collectedPaths = {};
  let collectedComponents = {};

  for (const file of files) {
    const parsedContent = parseYAMLFile(file);

    if (!parsedContent?.openapi) {
      console.warn('[WARN]', `Skipping non-OpenAPI file: ${file}`);
      continue;
    }

    collectedPaths = mergeObjects(collectedPaths, parsedContent.paths ?? {});

    collectedComponents = {
      ...collectedComponents,
      schemas: mergeObjects(collectedComponents.schemas, parsedContent.components?.schemas),
      parameters: mergeObjects(collectedComponents.parameters, parsedContent.components?.parameters),
      responses: mergeObjects(collectedComponents.responses, parsedContent.components?.responses),
      requestBodies: mergeObjects(collectedComponents.requestBodies, parsedContent.components?.requestBodies),
      headers: mergeObjects(collectedComponents.headers, parsedContent.components?.headers),
      examples: mergeObjects(collectedComponents.examples, parsedContent.components?.examples),
    };
  }

  return {
    paths: collectedPaths,
    components: collectedComponents,
  };
}

function removeEmptyComponentGroups(components) {
  return Object.fromEntries(Object.entries(components).filter(([, value]) => value && Object.keys(value).length > 0));
}

function generateOpenAPISpec(collected, outputFile) {
  const serverUrls = getServerUrls();
  const securityEnabled = isSecurityEnabled();

  const components = removeEmptyComponentGroups({
    ...(collected.components ?? {}),
    ...(securityEnabled
      ? {
          securitySchemes: {
            basicAuth: {
              type: 'http',
              scheme: 'basic',
            },
          },
        }
      : {}),
  });

  const openApiSpec = {
    openapi: getOpenApiVersion(),
    info: {
      title: getOpenApiTitle(),
      version: getOpenApiApiVersion(),
    },
    servers: serverUrls.map((url) => ({ url })),
    ...(Object.keys(components).length > 0 ? { components } : {}),
    ...(securityEnabled ? { security: [{ basicAuth: [] }] } : {}),
    paths: collected.paths,
  };

  writeYAMLToFile(outputFile, openApiSpec);
}

function main() {
  try {
    const filesToProcess = getAllYamlFiles(HANDLERS_PATH);

    if (filesToProcess.length === 0) {
      console.warn('[WARN]', `No YAML files found in: ${HANDLERS_PATH}`);
    }

    const collected = processOpenAPIFiles(filesToProcess);
    generateOpenAPISpec(collected, DIST_OPENAPI_PATH);

    console.log('[SUCCESS]', 'OpenAPI definitions generated and saved.');
    console.log('[COMPLETED]', 'API documentation generated successfully.');
  } catch (error) {
    console.error('[ERROR]', 'An error occurred:', error);
    process.exitCode = 1;
  }
}

main();
