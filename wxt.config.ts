import { defineConfig } from 'wxt';

export default defineConfig({
  srcDir: '.',
  outDir: '.output',
  manifest: {
    name: 'Receipt Statement Linker',
    short_name: 'Receipt Linker',
    description: 'Privately connect saved purchase receipts to statement CSV rows.',
    version: '1.0.0',
    permissions: ['storage', 'downloads', 'activeTab'],
    action: { default_title: 'Save this receipt' },
    options_ui: { page: 'options.html', open_in_tab: true },
    icons: {
      16: 'icon/16.png',
      32: 'icon/32.png',
      48: 'icon/48.png',
      128: 'icon/128.png'
    }
  },
  vite: () => ({ build: { target: 'es2022' } })
});
