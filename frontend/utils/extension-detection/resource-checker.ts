/**
 * Resource Checker
 * Probes for accessible extension resources
 */

/**
 * Checks if an extension resource is accessible
 * Returns a promise that resolves to true if the resource exists
 */
export function checkExtensionByResource(extensionId: string, resourcePath = 'icon.png'): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image();
    const timeout = setTimeout(() => {
      img.src = '';
      resolve(false);
    }, 100);

    img.onload = () => {
      clearTimeout(timeout);
      resolve(true);
    };

    img.onerror = () => {
      clearTimeout(timeout);
      resolve(false);
    };

    img.src = `chrome-extension://${extensionId}/${resourcePath}`;
  });
}
