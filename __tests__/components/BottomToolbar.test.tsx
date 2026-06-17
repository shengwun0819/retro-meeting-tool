import { render, screen, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import BottomToolbar from '@/components/toolbar/BottomToolbar'
import { CanvasTool } from '@/types'

function setup(activeTool: CanvasTool = 'select') {
  const onToolChange = jest.fn()
  render(<BottomToolbar activeTool={activeTool} onToolChange={onToolChange} />)
  return { onToolChange }
}

// ---------------------------------------------------------------------------
// Collapsed state (initial)
// ---------------------------------------------------------------------------

describe('BottomToolbar — collapsed state', () => {
  it('tool list has pointer-events-none when initially collapsed', () => {
    setup()
    const toolList = screen.getByTitle('Select').parentElement
    expect(toolList).toHaveClass('pointer-events-none')
  })

  it('toggle button is visible with the active tool icon', () => {
    setup()
    expect(screen.getByTitle('Drawing tools (Select)')).toBeInTheDocument()
  })

  it('all tool buttons are in the DOM even when collapsed', () => {
    setup()
    expect(screen.getByTitle('Select')).toBeInTheDocument()
    expect(screen.getByTitle('Text')).toBeInTheDocument()
    expect(screen.getByTitle('Rect')).toBeInTheDocument()
    expect(screen.getByTitle('Circle')).toBeInTheDocument()
    expect(screen.getByTitle('Arrow')).toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// Expand / collapse
// ---------------------------------------------------------------------------

describe('BottomToolbar — expand / collapse', () => {
  it('clicking the toggle button expands the tool list', async () => {
    const user = userEvent.setup()
    setup()
    await user.click(screen.getByTitle('Drawing tools (Select)'))
    const toolList = screen.getByTitle('Select').parentElement
    expect(toolList).toHaveClass('pointer-events-auto')
    expect(toolList).not.toHaveClass('pointer-events-none')
  })

  it('clicking the toggle button again collapses the tool list', async () => {
    const user = userEvent.setup()
    setup()
    await user.click(screen.getByTitle('Drawing tools (Select)'))
    await user.click(screen.getByTitle('Collapse tools'))
    const toolList = screen.getByTitle('Select').parentElement
    expect(toolList).toHaveClass('pointer-events-none')
  })
})

// ---------------------------------------------------------------------------
// Tool selection
// ---------------------------------------------------------------------------

describe('BottomToolbar — tool selection', () => {
  it('clicking a tool fires onToolChange with the correct tool id', async () => {
    const user = userEvent.setup()
    const { onToolChange } = setup()
    await user.click(screen.getByTitle('Drawing tools (Select)'))
    await user.click(screen.getByTitle('Text'))
    expect(onToolChange).toHaveBeenCalledWith('text')
  })

  it('clicking a tool collapses the toolbar', async () => {
    const user = userEvent.setup()
    setup()
    await user.click(screen.getByTitle('Drawing tools (Select)'))
    await user.click(screen.getByTitle('Arrow'))
    const toolList = screen.getByTitle('Arrow').parentElement
    expect(toolList).toHaveClass('pointer-events-none')
  })

  it('calls onToolChange with the correct id for each tool', async () => {
    const titleMap: Record<CanvasTool, string> = {
      select: 'Select', text: 'Text', rect: 'Rect', circle: 'Circle', arrow: 'Arrow',
    }
    const tools: CanvasTool[] = ['select', 'text', 'rect', 'circle', 'arrow']
    for (const tool of tools) {
      const user = userEvent.setup()
      const { onToolChange } = setup()
      await user.click(screen.getByTitle('Drawing tools (Select)'))
      await user.click(screen.getByTitle(titleMap[tool]))
      expect(onToolChange).toHaveBeenCalledWith(tool)
      cleanup()
    }
  })
})

// ---------------------------------------------------------------------------
// Active tool styling
// ---------------------------------------------------------------------------

describe('BottomToolbar — active tool styling', () => {
  it('toggle button has blue styling when a non-select tool is active', () => {
    setup('text')
    expect(screen.getByTitle('Drawing tools (Text)')).toHaveClass('bg-blue-500')
  })

  it('toggle button does NOT have blue styling when select tool is active', () => {
    setup('select')
    expect(screen.getByTitle('Drawing tools (Select)')).not.toHaveClass('bg-blue-500')
  })

  it('active tool button is highlighted with blue in the expanded list', async () => {
    const user = userEvent.setup()
    render(<BottomToolbar activeTool="rect" onToolChange={jest.fn()} />)
    await user.click(screen.getByTitle('Drawing tools (Rect)'))
    expect(screen.getByTitle('Rect')).toHaveClass('bg-blue-500')
    expect(screen.getByTitle('Select')).not.toHaveClass('bg-blue-500')
  })
})
