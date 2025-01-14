// The module 'vscode' contains the VS Code extensibility API
const vscode = require('vscode');
const { BigQuery } = require('@google-cloud/bigquery');
const debounce = require('lodash.debounce');

let statusBarItem;

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
  console.log('SQL Linter extension is now active!');

  // Register the manual linting command
  context.subscriptions.push(
    vscode.commands.registerCommand('sqlLinter.runLinting', async () => {
      const editor = vscode.window.activeTextEditor;
      if (editor) {
        const document = editor.document;
        await lintDocument(document, true);
      } else {
        vscode.window.showInformationMessage('No active editor detected.');
      }
    })
  );

  // Create a diagnostic collection
  const diagnosticCollection = vscode.languages.createDiagnosticCollection('sql');

  // Create status bar item
  statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
  statusBarItem.text = 'dryrun: active';
  context.subscriptions.push(statusBarItem);

  // Function to perform linting
  const lintDocument = async (document, ignoreFileType = false) => {
    if (!ignoreFileType && document.languageId !== 'sql') {
      return;
    }

    const sqlCode = document.getText();

    // Initialize BigQuery client
    const bigquery = new BigQuery();

    try {
      // Configure dry run query
      const options = {
        query: sqlCode,
        dryRun: true,
        useQueryCache: false,
      };

      // Run the dry run
      await bigquery.createQueryJob(options);

      // Clear any existing diagnostics if the query is valid
      diagnosticCollection.set(document.uri, []);

      console.log('Query dry run performed successfully.');
    } catch (error) {
      // Collect diagnostics from BigQuery errors
      const diagnostics = [];
      if (error.errors && error.errors.length > 0) {
        error.errors.forEach(err => {
          const message = err.message;

          // Try to extract line and character from error message
          const match = message.match(/at \[(\d+):(\d+)\]/);
          let range;

          if (match) {
            const line = parseInt(match[1], 10) - 1; // VS Code lines are 0-indexed
            const character = parseInt(match[2], 10) - 1; // VS Code characters are 0-indexed

            // Highlight from the error position to the end of the line
            range = new vscode.Range(
              new vscode.Position(line, character),
              new vscode.Position(line, document.lineAt(line).range.end.character)
            );
          } else {
            // If no match, highlight the entire document
            range = new vscode.Range(
              document.positionAt(0),
              document.positionAt(sqlCode.length)
            );
          }

          const diagnostic = new vscode.Diagnostic(
            range,
            message,
            vscode.DiagnosticSeverity.Error
          );
          diagnostics.push(diagnostic);
        });
      } else {
        // General error without specific details
        const range = new vscode.Range(
          document.positionAt(0),
          document.positionAt(sqlCode.length)
        );
        const diagnostic = new vscode.Diagnostic(
          range,
          error.message,
          vscode.DiagnosticSeverity.Error
        );
        diagnostics.push(diagnostic);
      }
      diagnosticCollection.set(document.uri, diagnostics);
      console.error('Query not performed:', error);
    }
  };

  // Read configuration settings
  const config = vscode.workspace.getConfiguration('sqlLinter');
  const liveLinting = config.get('liveLinting', false);
  const debounceInterval = config.get('debounceInterval', 500);
  const rateLimit = config.get('rateLimit', 30);

  // Rate limiting variables
  let requestCount = 0;
  let rateLimitResetTime = Date.now() + 60000; // 1 minute from now

  // Debounced and rate-limited linting function
  const debouncedLint = debounce(async (document) => {
    const currentTime = Date.now();

    // Reset rate limit every minute
    if (currentTime > rateLimitResetTime) {
      requestCount = 0;
      rateLimitResetTime = currentTime + 60000;
    }

    if (requestCount >= rateLimit) {
      vscode.window.showWarningMessage('Rate limit exceeded for live linting. Change settings or slow down.');
      return;
    }

    requestCount++;

    await lintDocument(document);
  }, debounceInterval);

  // Lint on open
  context.subscriptions.push(
    vscode.workspace.onDidOpenTextDocument(async (document) => {
      await lintDocument(document);
    })
  );

  // Lint on save
  context.subscriptions.push(
    vscode.workspace.onDidSaveTextDocument(async (document) => {
      await lintDocument(document);
    })
  );

  // Live linting
  if (liveLinting) {
    context.subscriptions.push(
      vscode.workspace.onDidChangeTextDocument(async (event) => {
        const document = event.document;
        debouncedLint(document);
      })
    );
  }

  // Update status bar visibility based on active editor
  function updateStatusBarVisibility() {
    const editor = vscode.window.activeTextEditor;
    if (editor && (editor.document.languageId === 'sql')) {
      statusBarItem.show();
    } else {
      statusBarItem.hide();
    }
  }

  // Initialize status bar visibility
  updateStatusBarVisibility();

  // Listen for active editor changes to update status bar
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor(() => {
      updateStatusBarVisibility();
    })
  );

  // Listen for changes in the document to update status bar visibility
  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument((event) => {
      // If the changed document is the active document
      if (event.document === vscode.window.activeTextEditor?.document) {
        updateStatusBarVisibility();
      }
    })
  );

  // Listen for configuration changes
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration('sqlLinter')) {
        // Notify user to reload if settings have changed
        vscode.window.showInformationMessage('SQL Linter configuration changed. Please reload VS Code to apply the changes.');
      }
    })
  );
}

function deactivate() {}

module.exports = {
  activate,
  deactivate
};
