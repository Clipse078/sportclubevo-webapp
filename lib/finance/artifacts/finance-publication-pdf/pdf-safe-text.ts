/** pdf-lib StandardFonts use WinAnsi encoding — normalize Finance formatting for drawing. */
export function pdfSafeText(value: string): string {
  return value
    .replace(/\u00a0/g, " ")
    .replace(/\u2013|\u2014/g, "-")
    .replace(/[^\x09\x0a\x0d\x20-\xff]/g, (char) => {
      const normalized = char.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      return normalized.charCodeAt(0) <= 0xff ? normalized : "?";
    });
}
