// Este es el archivo principal de la extensión, normalmente llamado `extension.js`.
// Contiene la lógica central para registrar y ejecutar el comando.

// Importamos el módulo de la API de VS Code, que nos da acceso a todas las funcionalidades del editor.
const vscode = require('vscode');

/**
 * Esta función se llama cuando tu extensión es activada.
 * La activación ocurre la primera vez que se ejecuta uno de los comandos de la extensión.
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {

    console.log('¡Felicidades, tu extensión "asistente-actualizacion" está activa!');

    // Registramos nuestro comando. El ID del comando debe coincidir con el que se define en el archivo `package.json`.
    // La función que pasamos como segundo argumento se ejecutará cada vez que se llame al comando.
    let disposable = vscode.commands.registerCommand('asistente-actualizacion.updateFileFromClipboard', async function () {
        
        try {
            // 1. Leer el contenido del portapapeles.
            const clipboardContent = await vscode.env.clipboard.readText();

            if (!clipboardContent) {
                vscode.window.showInformationMessage('El portapapeles está vacío.');
                return;
            }

            // 2. Extraer el nombre del archivo usando una expresión regular.
            // Buscamos una línea que empiece con `// FILENAME:`, `/* FILENAME:`, `# FILENAME:` etc.
            const filenameMatch = clipboardContent.match(/^(?:\/\/|\/\*|#)\s*FILENAME:\s*([^\s*]+)/);
            
            if (!filenameMatch || !filenameMatch[1]) {
                vscode.window.showErrorMessage('No se encontró la etiqueta "FILENAME:" en el código copiado. Asegúrate de que la primera línea sea un comentario como: // FILENAME: ruta/al/archivo.js');
                return;
            }

            const relativePath = filenameMatch[1];

            // 3. Buscar el archivo en el espacio de trabajo actual.
            // `findFiles` busca en todo el proyecto abierto.
            const files = await vscode.workspace.findFiles(relativePath, '**/node_modules/**', 1);

            if (files.length === 0) {
                vscode.window.showErrorMessage(`El archivo "${relativePath}" no se encontró en tu proyecto.`);
                return;
            }

            const fileUri = files[0];

            // 4. (Paso de seguridad) Pedir confirmación al usuario.
            const confirmation = await vscode.window.showWarningMessage(
                `¿Estás seguro de que quieres reemplazar TODO el contenido de "${relativePath}"? Esta acción no se puede deshacer fácilmente.`,
                { modal: true }, // `modal: true` hace que el usuario deba responder antes de continuar.
                'Sí, reemplazar'
            );

            if (confirmation !== 'Sí, reemplazar') {
                vscode.window.showInformationMessage('Operación cancelada.');
                return;
            }

            // 5. Extraer el código real (todo lo que no es el comentario FILENAME).
            const codeToPaste = clipboardContent.substring(clipboardContent.indexOf('\n') + 1).trim();

            // 6. Reemplazar el contenido del archivo.
            // Usamos WorkspaceEdit para una operación de escritura más segura y compatible con el historial de VS Code.
            const edit = new vscode.WorkspaceEdit();
            const wholeFileRange = new vscode.Range(
                new vscode.Position(0, 0),
                // Obtenemos la última línea del documento para asegurarnos de que reemplazamos todo.
                (await vscode.workspace.openTextDocument(fileUri)).lineAt((await vscode.workspace.openTextDocument(fileUri)).lineCount - 1).range.end
            );

            edit.replace(fileUri, wholeFileRange, codeToPaste);
            await vscode.workspace.applyEdit(edit);
            
            // 7. Mostrar notificación de éxito.
            vscode.window.showInformationMessage(`¡Archivo "${relativePath}" actualizado correctamente!`);

            // Opcional: Abrir y mostrar el archivo modificado.
            const document = await vscode.workspace.openTextDocument(fileUri);
            await vscode.window.showTextDocument(document);


        } catch (error) {
            console.error(error);
            vscode.window.showErrorMessage('Ocurrió un error inesperado al actualizar el archivo.');
        }
    });

    // Agregamos el comando al contexto para que se gestione su ciclo de vida.
    context.subscriptions.push(disposable);
}

// Esta función se llama cuando tu extensión es desactivada.
function deactivate() {}

module.exports = {
    activate,
    deactivate
}
