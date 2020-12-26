import { MarkdownView, Plugin } from 'obsidian';

type RangeInfo = {
    start: CodeMirror.Position
    end: CodeMirror.Position
    text: string[]
}

export default class MoveTextPlugin extends Plugin {
    onInit() { }

    async onload() {
        this.addCommand({
            id: 'app:move-text-up',
            name: 'Move current line or selection up',
            callback: () => this.moveLine(-1),
            hotkeys: [
                {
                    modifiers: ["Alt"],
                    key: "ArrowUp",
                },
            ],
        })

        this.addCommand({
            id: 'app:move-text-down',
            name: 'Move current line or selection down',
            callback: () => this.moveLine(1),
            hotkeys: [
                {
                    modifiers: ["Alt"],
                    key: "ArrowDown",
                },
            ],
        })
    }

    onunload() { }

    moveLine(direction: number) {
        const mdView = this.app.workspace.activeLeaf.view as MarkdownView;
        const editor = mdView.sourceMode.cmEditor
        const doc = editor.getDoc()

        // In case of no selection, selection start and selection end is equal to cursor's line
        const { selectionStart, selectionEnd } = this.getSelectionStartEnd(doc)

        // Don't move if moving outside first or last line
        if ((direction < 0 && selectionStart === 0) ||
            (direction > 0 && selectionEnd === doc.lineCount() - 1)) {
            return
        }

        const targetLineIndex = direction > 0 ? selectionEnd + 1 : selectionStart - 1
        const { text: targetLineText, start: targetLineStart, end: targetLineEnd } = this.getRangeInfo(doc, targetLineIndex)
        const { text: currentSelectionText, start: currentRangeStart, end: currentRangeEnd } = this.getRangeInfo(doc, selectionStart, selectionEnd)

        // Move text up
        if (direction < 0) {
            doc.replaceRange([...currentSelectionText, ...targetLineText], targetLineStart, currentRangeEnd)
        }
        // Move text down
        if (direction > 0) {
            doc.replaceRange([...targetLineText,...currentSelectionText], currentRangeStart, targetLineEnd)
        }

        // Set cursor or selection to moved text
        if (selectionStart === selectionEnd) {
            doc.setCursor(targetLineStart)
        } else {
            const { start: targetRangeStart, end: targetRangeEnd } = this.getRangeInfo(doc, selectionStart + direction, selectionEnd + direction)
            doc.setSelection(targetRangeStart, targetRangeEnd, { scroll: true })
        }

        // Fix indentation
        editor.indentSelection('smart')
    }

    getSelectionStartEnd(doc: CodeMirror.Doc) {
        const selectedLines = doc.listSelections()
        let selectionStart = selectedLines[0].head.line
        let selectionEnd = selectedLines[0].anchor.line

        if (selectionStart > selectionEnd) {
            const selectionStartTemp = selectionStart
            selectionStart = selectionEnd
            selectionEnd = selectionStartTemp
        }

        return { selectionStart, selectionEnd }
    }

    getRangeInfo(doc: CodeMirror.Doc, selectionStart: number, selectionEnd?: number): RangeInfo {
        if (!selectionEnd) {
            selectionEnd = selectionStart
        }
        const lastLineInRange = doc.getLine(selectionEnd)

        const start = { line: selectionStart, ch: 0 }
        const end = { line: selectionEnd, ch: lastLineInRange.length }
        const text = doc.getRange(start, end).split('\n')

        return { start, end, text }
    }
}