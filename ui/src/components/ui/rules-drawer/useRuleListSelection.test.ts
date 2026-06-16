import { describe, expect, it } from 'vitest'
import {
  applyRuleListClick,
  createRuleListSelectionState,
  useRuleListSelection,
} from './useRuleListSelection'

const ORDERED = ['a', 'b', 'c', 'd', 'e']

describe('applyRuleListClick', () => {
  it('plain click selects a single item', () => {
    const next = applyRuleListClick(
      createRuleListSelectionState(),
      'c',
      2,
      ORDERED,
      { shiftKey: false, metaKey: false, ctrlKey: false },
    )
    expect([...next.selectedIds]).toEqual(['c'])
    expect(next.anchorId).toBe('c')
  })

  it('shift click selects a range from anchor', () => {
    let state = applyRuleListClick(
      createRuleListSelectionState(),
      'b',
      1,
      ORDERED,
      { shiftKey: false, metaKey: false, ctrlKey: false },
    )
    state = applyRuleListClick(
      state,
      'd',
      3,
      ORDERED,
      { shiftKey: true, metaKey: false, ctrlKey: false },
    )
    expect([...state.selectedIds]).toEqual(['b', 'c', 'd'])
  })

  it('cmd/ctrl click toggles without clearing others', () => {
    let state = applyRuleListClick(
      createRuleListSelectionState(),
      'a',
      0,
      ORDERED,
      { shiftKey: false, metaKey: false, ctrlKey: false },
    )
    state = applyRuleListClick(
      state,
      'c',
      2,
      ORDERED,
      { shiftKey: false, metaKey: true, ctrlKey: false },
    )
    expect([...state.selectedIds]).toEqual(['a', 'c'])

    state = applyRuleListClick(
      state,
      'a',
      0,
      ORDERED,
      { shiftKey: false, metaKey: false, ctrlKey: true },
    )
    expect([...state.selectedIds]).toEqual(['c'])
  })
})

describe('useRuleListSelection (check mode helpers)', () => {
  it('toggleSelected toggles membership', () => {
    const sel = useRuleListSelection()
    expect([...sel.selectedIds.value]).toEqual([])

    sel.toggleSelected('a')
    expect([...sel.selectedIds.value]).toEqual(['a'])

    sel.toggleSelected('a')
    expect([...sel.selectedIds.value]).toEqual([])
  })

  it('setSelected overwrites selection and updates anchor', () => {
    const sel = useRuleListSelection()
    sel.setSelected(['a', 'c'])
    expect([...sel.selectedIds.value]).toEqual(['a', 'c'])
    expect(sel.anchorId.value).toBe('c')
  })

  it('isAllSelected / isAnySelected reflect current selection', () => {
    const sel = useRuleListSelection()
    sel.setSelected(['b', 'c'])
    expect(sel.isAnySelected(['a', 'b'])).toBe(true)
    expect(sel.isAllSelected(['b', 'c'])).toBe(true)
    expect(sel.isAllSelected(['b', 'c', 'd'])).toBe(false)
  })

  it('idsForDrag returns selected set when dragging selected item', () => {
    const sel = useRuleListSelection()
    sel.setSelected(['a', 'c', 'e'])
    expect(sel.idsForDrag('c', ORDERED)).toEqual(['a', 'c', 'e'])
    expect(sel.idsForDrag('b', ORDERED)).toEqual(['b'])
  })
})
