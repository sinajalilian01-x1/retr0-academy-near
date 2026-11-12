declare module 'emmet' {
  export type SyntaxType = 'markup' | 'stylesheet'
  export type UserConfig = {
    syntax?: string
    type?: SyntaxType
    options?: {
      'output.indent'?: string
      'output.field'?: (index: number, placeholder: string) => string
    }
  }
  export interface ExtractedAbbreviation {
    abbreviation: string
    location: number
    start: number
    end: number
  }
  export default function expand(abbreviation: string, config?: UserConfig): string
  export function extract(
    line: string,
    pos?: number,
    options?: { type?: SyntaxType; lookAhead?: boolean },
  ): ExtractedAbbreviation | undefined
}
