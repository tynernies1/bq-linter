# VSCode Extension bq dryrun sql linter

VSCode Extension bq dryrun sql linter is a Visual Studio Code extension that checks SQL code against a BigQuery server using the dry run command. It shows errors returned from the server directly in the editor, helping developers catch issues in their SQL code early.

## Features

- Lint SQL files by performing a dry run against a BigQuery server.
- Display errors and warnings inline in the editor.
- Supports `.sql` files.

## Installation

You can install the extension directly from the [Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=timle.bq-dryrun-sql-linter):

1. **Install from Marketplace**:
   - Open Visual Studio Code.
   - Go to the Extensions view (`Ctrl`+`Shift`+`X` or `Cmd`+`Shift`+`X`).
   - In the search box, type `BQ Dry Run SQL Linter`.
   - Find the extension published by `timle`.
   - Click **Install** to add the extension to your VS Code.

Alternatively, you can install it directly from the marketplace link:

- Visit the [extension page on Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=timle.bq-dryrun-sql-linter).
- Click **Install** and follow the prompts to install the extension.

## Usage

- Open a `.sql` file in Visual Studio Code.
- The extension will automatically perform a dry run against the BigQuery server and display any errors or warnings in the Problems panel and inline in the editor.

## Requirements

- Access to a Google Cloud BigQuery project.
- Properly configured Google Cloud credentials.

If you are running dbt locally, you've already done this. For others, see:

- [Install the Google Cloud SDK](https://cloud.google.com/sdk/docs/install)
- [Authenticate with Google Cloud](https://cloud.google.com/docs/authentication/getting-started)

## Extension Settings

**Lint on Save**: By default, the extension lints SQL files when they are saved.

**Live Lint Option**: Users can enable live linting through the extension settings (`sqlLinter.liveLinting`).

**Debouncing and Rate Limiting**: When live linting is enabled, debouncing and rate limiting control the number of requests to the BigQuery server, minimizing the number of requests per minute.

**Configurable Settings**: Users can adjust the debounce interval (`sqlLinter.debounceInterval`) and rate limit (`sqlLinter.rateLimit`) in the extension settings to suit their preferences.

<!-- This extension contributes the following settings:

- `sql-linter.projectId`: Set your Google Cloud project ID.
- `sql-linter.credentials`: Path to your service account credentials JSON file. -->

## Dev Work

To test and use the extension:

Open the project folder in VS Code:

- You can run `code .` in the terminal from the project directory to open VS Code in the current folder.
- Ensure all dependencies are installed (already done with `npm install`).

Launch the extension in a new Extension Development Host window:

- Press `F5` in VS Code. This will compile the extension and open a new window where the extension is running.
- In the new window, create or open a `.sql` file and write some SQL code.

As you write, the extension will send your SQL code to BigQuery for a dry run. Any errors returned from BigQuery will be highlighted directly in the editor.

### Packaging

- Run `vsce package` to create a `.vsix` package of the extension.

### Publishing

Refer to the [Publishing Extension Guide](https://code.visualstudio.com/api/working-with-extensions/publishing-extension):

- Run `vsce login <publisher id>` to log in.
- Run `vsce publish` to publish the extension.

## Known Issues

- Currently supports only BigQuery SQL syntax.
- May not handle all types of SQL syntax variations.

## Release Notes

### 0.0.1

- Initial release of SQL Linter extension.

## License

[MIT License](LICENSE.txt)
