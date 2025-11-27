export interface NativeDownloadMessage {
  type: 'file-download'
  filename: string
  mimeType: string
  data: string
}

const getReactNativeWebView = () => {
  if (typeof window === 'undefined') {
    return undefined
  }

  return (window as unknown as { ReactNativeWebView?: { postMessage: (message: string) => void } })
    .ReactNativeWebView
}

/**
 * Handle file downloads for both standard browsers and React Native WebViews.
 * When a React Native WebView is detected, the blob is converted to Base64 and
 * posted to the native layer so it can persist the file using platform
 * specific APIs.
 */
export const downloadBlob = (blob: Blob, filename: string) => {
  if (typeof window === 'undefined') {
    return
  }

  const mimeType = blob.type || 'application/octet-stream'
  const webview = getReactNativeWebView()

  if (webview && typeof webview.postMessage === 'function') {
    const reader = new FileReader()

    reader.onloadend = () => {
      try {
        const result = reader.result
        const base64Data = typeof result === 'string' ? result.split(',')[1] || '' : ''
        const message: NativeDownloadMessage = {
          type: 'file-download',
          filename,
          mimeType,
          data: base64Data
        }
        webview.postMessage(JSON.stringify(message))
      } catch (error) {
        console.error('Failed to prepare file for React Native WebView download:', error)
      }
    }

    reader.onerror = (event) => {
      console.error('Error reading blob for download:', event)
    }

    reader.readAsDataURL(blob)
    return
  }

  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  window.URL.revokeObjectURL(url)
  document.body.removeChild(link)
}
