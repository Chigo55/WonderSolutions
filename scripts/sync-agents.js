const fs = require('fs');
const path = require('path');

// Helper to recreate directories
function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function clearDir(dirPath) {
  if (fs.existsSync(dirPath)) {
    fs.rmSync(dirPath, { recursive: true, force: true });
  }
  ensureDir(dirPath);
}

// Simple YAML frontmatter parser
function parseYAML(yamlString) {
  const lines = yamlString.split(/\r?\n/);
  const result = {};
  let currentKey = null;
  let blockValue = [];
  let inBlock = false;
  let blockType = null;

  for (let line of lines) {
    if (inBlock) {
      if (line.trim() === '' || /^\s+/.test(line)) {
        blockValue.push(line.replace(/^\s{2}/, '')); // remove 2 spaces of indentation
      } else {
        if (blockType === '>') {
          result[currentKey] = blockValue.join(' ').replace(/\s+/g, ' ').trim();
        } else {
          result[currentKey] = blockValue.join('\n');
        }
        inBlock = false;
        currentKey = null;
        blockValue = [];
      }
    }
    
    if (!inBlock) {
      const match = line.match(/^([^:]+):\s*(.*)$/);
      if (match) {
        const key = match[1].trim();
        const value = match[2].trim();
        if (value === '>' || value === '|') {
          currentKey = key;
          inBlock = true;
          blockType = value;
        } else {
          let val = value;
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.substring(1, val.length - 1);
          }
          result[key] = val;
        }
      }
    }
  }
  
  if (inBlock && currentKey) {
    if (blockType === '>') {
      result[currentKey] = blockValue.join(' ').replace(/\s+/g, ' ').trim();
    } else {
      result[currentKey] = blockValue.join('\n');
    }
  }
  
  return result;
}

function parseFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const normalized = content.replace(/\r\n/g, '\n');
  if (!normalized.startsWith('---\n')) {
    return { frontmatter: {}, body: content };
  }
  
  const endIdx = normalized.indexOf('\n---\n', 4);
  if (endIdx === -1) {
    return { frontmatter: {}, body: content };
  }
  
  const yamlString = normalized.substring(4, endIdx);
  const body = normalized.substring(endIdx + 5);
  const frontmatter = parseYAML(yamlString);
  return { frontmatter, body };
}

function copyRecursive(src, dest) {
  const exists = fs.existsSync(src);
  const stats = exists && fs.statSync(src);
  const isDirectory = exists && stats.isDirectory();
  if (isDirectory) {
    ensureDir(dest);
    fs.readdirSync(src).forEach(childItemName => {
      copyRecursive(path.join(src, childItemName), path.join(dest, childItemName));
    });
  } else {
    fs.copyFileSync(src, dest);
  }
}

function getDisplayName(name) {
  const customNames = {
    'orchestrator': 'Orchestrator Agent',
    'analyzer': 'Analyzer Agent',
    'researcher': 'Researcher Agent',
    'planner': 'Planner Agent',
    'developer': 'Developer Agent',
    'inspector': 'Inspector Agent',
    'modifier': 'Modifier Agent',
    'ruler': 'Ruler Agent',
    'templater': 'Templater Agent'
  };
  return customNames[name] || (name.charAt(0).toUpperCase() + name.slice(1) + ' Agent');
}

function mapTools(toolsString) {
  if (!toolsString) return [];
  const tools = toolsString.split(',').map(t => t.trim());
  const mapped = new Set();
  const toolMapping = {
    'Read': ['view_file'],
    'Grep': ['grep_search'],
    'Glob': ['list_dir'],
    'Write': ['write_to_file'],
    'Edit': ['replace_file_content', 'multi_replace_file_content'],
    'Bash': ['run_command'],
    'Agent': ['invoke_subagent', 'define_subagent'],
    'WebSearch': ['search_web'],
    'WebFetch': ['read_url_content']
  };
  
  for (const tool of tools) {
    if (toolMapping[tool]) {
      toolMapping[tool].forEach(t => mapped.add(t));
    } else if (tool.startsWith('mcp__plugin_context7_context7__')) {
      const actualTool = tool.replace('mcp__plugin_context7_context7__', 'context7/');
      mapped.add(actualTool);
      mapped.add(tool);
    } else {
      mapped.add(tool);
    }
  }
  return Array.from(mapped);
}

function runSync() {
  const projectRoot = path.resolve(__dirname, '..');
  const pluginsDir = path.join(projectRoot, 'plugins');
  const agentsDestDir = path.join(projectRoot, '.agents');

  console.log('Starting sync to Antigravity .agents configuration...');

  // Recreate .agents directories
  clearDir(path.join(agentsDestDir, 'agents'));
  clearDir(path.join(agentsDestDir, 'workflows'));
  clearDir(path.join(agentsDestDir, 'skills'));
  clearDir(path.join(agentsDestDir, 'rules'));

  // 1. Process Agents
  const agentFiles = [];
  const pluginNames = fs.readdirSync(pluginsDir);
  for (const pluginName of pluginNames) {
    const pluginAgentsDir = path.join(pluginsDir, pluginName, 'agents');
    if (fs.existsSync(pluginAgentsDir)) {
      fs.readdirSync(pluginAgentsDir).forEach(file => {
        if (file.endsWith('.md')) {
          agentFiles.push({
            pluginName,
            filePath: path.join(pluginAgentsDir, file),
            baseName: path.basename(file, '.md')
          });
        }
      });
    }
  }

  for (const agentInfo of agentFiles) {
    const { frontmatter, body } = parseFile(agentInfo.filePath);
    const agentName = frontmatter.name || agentInfo.baseName;
    const description = frontmatter.description || '';
    const toolsString = frontmatter.tools || '';
    
    const mappedTools = mapTools(toolsString);
    
    let finalBody = body;
    if (agentName === 'templater') {
      finalBody = `Note: When running under Antigravity, \`\${CLAUDE_PLUGIN_ROOT}\` resolves to the workspace relative path \`./plugins/wonder-utilities\`.\n\n` + finalBody;
    }
    
    const agentJSON = {
      name: agentName,
      displayName: getDisplayName(agentName),
      description: description,
      hidden: false,
      customAgentSpec: {
        customAgent: {
          systemPromptSections: [
            {
              title: "Instructions",
              content: finalBody.trim()
            }
          ],
          toolNames: mappedTools
        }
      }
    };
    
    const agentDestDir = path.join(agentsDestDir, 'agents', agentName);
    ensureDir(agentDestDir);
    fs.writeFileSync(
      path.join(agentDestDir, 'agent.json'),
      JSON.stringify(agentJSON, null, 2),
      'utf-8'
    );
    console.log(`✓ Synchronized Agent: ${agentName}`);
  }

  // 2. Process Workflows (Commands)
  const commandFiles = [];
  for (const pluginName of pluginNames) {
    const pluginCommandsDir = path.join(pluginsDir, pluginName, 'commands');
    if (fs.existsSync(pluginCommandsDir)) {
      fs.readdirSync(pluginCommandsDir).forEach(file => {
        if (file.endsWith('.md')) {
          commandFiles.push({
            pluginName,
            filePath: path.join(pluginCommandsDir, file),
            baseName: path.basename(file, '.md')
          });
        }
      });
    }
  }

  for (const commandInfo of commandFiles) {
    const { frontmatter, body } = parseFile(commandInfo.filePath);
    const commandName = commandInfo.baseName;
    const description = frontmatter.description || '';
    
    const newFrontmatter = {
      name: commandName,
      description: description
    };
    
    let output = '---\n';
    for (const [k, v] of Object.entries(newFrontmatter)) {
      output += `${k}: ${JSON.stringify(v)}\n`;
    }
    output += '---\n\n' + body.trim() + '\n';
    
    fs.writeFileSync(
      path.join(agentsDestDir, 'workflows', `${commandName}.md`),
      output,
      'utf-8'
    );
    console.log(`✓ Synchronized Workflow: ${commandName}`);
  }

  // 3. Process Rules
  const ruleFiles = [];
  for (const pluginName of pluginNames) {
    const pluginRulesDir = path.join(pluginsDir, pluginName, 'rules');
    if (fs.existsSync(pluginRulesDir)) {
      fs.readdirSync(pluginRulesDir).forEach(file => {
        if (file.endsWith('.md')) {
          ruleFiles.push({
            pluginName,
            filePath: path.join(pluginRulesDir, file),
            baseName: path.basename(file, '.md')
          });
        }
      });
    }
  }

  for (const ruleInfo of ruleFiles) {
    const { frontmatter, body } = parseFile(ruleInfo.filePath);
    const ruleName = ruleInfo.baseName;
    const description = frontmatter.title || frontmatter.description || ruleName;
    
    const newFrontmatter = {
      description: description,
      activation: 'always',
      ...frontmatter
    };
    
    let output = '---\n';
    for (const [k, v] of Object.entries(newFrontmatter)) {
      output += `${k}: ${JSON.stringify(v)}\n`;
    }
    output += '---\n\n' + body.trim() + '\n';
    
    fs.writeFileSync(
      path.join(agentsDestDir, 'rules', `${ruleName}.md`),
      output,
      'utf-8'
    );
    console.log(`✓ Synchronized Rule: ${ruleName}`);
  }

  // 4. Process Skills
  for (const pluginName of pluginNames) {
    const pluginSkillsDir = path.join(pluginsDir, pluginName, 'skills');
    if (fs.existsSync(pluginSkillsDir)) {
      fs.readdirSync(pluginSkillsDir).forEach(skillDirName => {
        const srcSkillDir = path.join(pluginSkillsDir, skillDirName);
        if (fs.statSync(srcSkillDir).isDirectory()) {
          const destSkillDir = path.join(agentsDestDir, 'skills', skillDirName);
          copyRecursive(srcSkillDir, destSkillDir);
          console.log(`✓ Synchronized Skill: ${skillDirName}`);
        }
      });
    }
  }

  console.log('Antigravity synchronization complete.');
}

if (require.main === module) {
  runSync();
} else {
  module.exports = {
    parseYAML,
    parseFile,
    mapTools,
    getDisplayName
  };
}
