import puppeteer from 'puppeteer';

export interface PuppeteerConfig {
  headless: boolean;
  args: string[];
  executablePath?: string;
}

export function getPuppeteerConfig(): PuppeteerConfig {
  const config: PuppeteerConfig = {
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--single-process',
      '--disable-gpu',
      '--disable-web-security',
      '--disable-features=VizDisplayCompositor',
      '--disable-extensions',
      '--disable-plugins',
      '--disable-default-apps',
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding'
    ]
  };

  if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
    config.executablePath = process.env.CHROME_EXECUTABLE_PATH;
  }

  return config;
}

export async function launchBrowser() {
  try {
    if (process.env.VERCEL) {
      try {
        const chromium = (await import('@sparticuz/chromium')).default;
        
        return await puppeteer.launch({
          args: chromium.args,
          executablePath: await chromium.executablePath(),
          headless: true,
        });
      } catch (chromiumError) {
        console.warn('Failed to load @sparticuz/chromium, falling back to standard puppeteer:', chromiumError);
      }
    }
    
    const config = getPuppeteerConfig();
    return await puppeteer.launch(config);
  } catch (error) {
    console.error('Failed to launch browser with config:', error);
    
    // Final fallback configuration
    const fallbackConfig = {
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    };
    
    console.log('Trying fallback Puppeteer configuration...');
    return await puppeteer.launch(fallbackConfig);
  }
}
