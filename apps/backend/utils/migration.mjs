import { execSync } from 'child_process';
import path from 'path';
import process from 'process';

// Helper function to execute TypeORM commands
function executeTypeORMCommand(command) {
  // Replace your baseCommand definition with this
  const baseCommand = `node -r ts-node/register ${path.join('node_modules', '.bin', 'typeorm')}`;

  const configPath = '-d ./src/config/typeorm.ts';
  let commandToExecute;

  switch (command.action) {
    case 'run':
      commandToExecute = `${baseCommand} migration:run ${configPath}`;
      break;
    case 'generate':
      if (!command.name) {
        console.error('Migration name is required for generate action.');
        process.exit(1);
      }
      commandToExecute = `${baseCommand} ${configPath} migration:generate ./src/migrations/${command.name}`;
      break;
    case 'create':
      if (!command.name) {
        console.error('Migration name is required for create action.');
        process.exit(1);
      }
      commandToExecute = `${baseCommand} migration:create ./src/migrations/${command.name}`;
      break;
    case 'revert':
      commandToExecute = `${baseCommand} migration:revert ${configPath}`;
      break;
    default:
      console.error(`Unknown action: ${command.action}`);
      process.exit(1);
  }

  // Execute the command
  console.log(`Executing command: ${commandToExecute}`);
  execSync(commandToExecute, { stdio: 'inherit' });
}

// Main function to parse arguments and execute commands
function main() {
  const [, , action, name] = process.argv;
  if (!action) {
    console.error('Usage: node MigrationHandler.mjs <action> [name]');
    process.exit(1);
  }

  executeTypeORMCommand({ action, name });
}

main();
