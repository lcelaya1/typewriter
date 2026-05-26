import FontFamily from '@tiptap/extension-font-family'

const injectedFonts = new Set<string>()

function injectFontFace(family: string, url: string, format: string) {
  if (injectedFonts.has(family)) return
  injectedFonts.add(family)
  const style = document.createElement('style')
  style.textContent = `@font-face { font-family: '${family}'; src: url('${url}') format('${format}'); font-weight: normal; font-style: normal; }`
  document.head.appendChild(style)
}

export interface FontEntry {
  family: string
  url: string
  format: string
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    customFontFamily: {
      setCustomFont: (family: string, fontEntry?: FontEntry) => ReturnType
    }
  }
}

export const CustomFontFamily = FontFamily.extend({
  name: 'fontFamily',

  addCommands() {
    return {
      ...(this as any).parent?.(),
      setCustomFont: (family: string, fontEntry?: FontEntry) => ({ commands }: { commands: any }) => {
        if (fontEntry && !injectedFonts.has(family)) {
          injectFontFace(family, fontEntry.url, fontEntry.format)
        }
        return commands.setFontFamily(family)
      },
    }
  },
})

export { injectFontFace }
