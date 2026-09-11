declare module 'child_process' {
  export function execFileSync(
    command: string,
    args: string[],
    options: { encoding: 'utf8' },
  ): string;
}
