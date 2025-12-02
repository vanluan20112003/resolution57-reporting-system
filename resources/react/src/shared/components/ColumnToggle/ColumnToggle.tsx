/**
 * Column Toggle Component
 * Cho phép người dùng ẩn/hiện các cột trong bảng
 * Lưu trạng thái vào localStorage
 */

import { useState, useEffect, useCallback } from 'react'
import { Button, Checkbox, Popover, Space, Divider, Tooltip } from 'antd'
import { SettingOutlined, EyeOutlined, EyeInvisibleOutlined } from '@ant-design/icons'
import type { CheckboxChangeEvent } from 'antd/es/checkbox'
import './ColumnToggle.css'

// Column definition for toggle
export interface ToggleableColumn {
  key: string
  title: string
  defaultVisible?: boolean
  fixed?: boolean // Nếu true, cột này không thể ẩn
}

interface ColumnToggleProps {
  columns: ToggleableColumn[]
  visibleColumns: string[]
  onChange: (visibleColumns: string[]) => void
  storageKey?: string // Key để lưu vào localStorage
}

function ColumnToggle({
  columns,
  visibleColumns,
  onChange,
  storageKey,
}: ColumnToggleProps) {
  const [open, setOpen] = useState(false)

  // Load từ localStorage khi mount
  useEffect(() => {
    if (storageKey) {
      const saved = localStorage.getItem(`${storageKey}_columns`)
      if (saved) {
        try {
          const savedColumns = JSON.parse(saved)
          // Đảm bảo các cột fixed luôn hiển thị
          const fixedKeys = columns.filter(c => c.fixed).map(c => c.key)
          const mergedColumns = [...new Set([...savedColumns, ...fixedKeys])]
          onChange(mergedColumns)
        } catch (e) {
          console.error('Failed to load column settings:', e)
        }
      }
    }
  }, [storageKey]) // eslint-disable-line react-hooks/exhaustive-deps

  // Lưu vào localStorage khi thay đổi
  const saveToStorage = useCallback((cols: string[]) => {
    if (storageKey) {
      localStorage.setItem(`${storageKey}_columns`, JSON.stringify(cols))
    }
  }, [storageKey])

  // Toggle một cột
  const handleToggle = (key: string, checked: boolean) => {
    let newVisibleColumns: string[]
    if (checked) {
      newVisibleColumns = [...visibleColumns, key]
    } else {
      newVisibleColumns = visibleColumns.filter(k => k !== key)
    }
    onChange(newVisibleColumns)
    saveToStorage(newVisibleColumns)
  }

  // Hiện tất cả
  const handleShowAll = () => {
    const allKeys = columns.map(c => c.key)
    onChange(allKeys)
    saveToStorage(allKeys)
  }

  // Ẩn tất cả (trừ cột fixed)
  const handleHideAll = () => {
    const fixedKeys = columns.filter(c => c.fixed).map(c => c.key)
    onChange(fixedKeys)
    saveToStorage(fixedKeys)
  }

  // Reset về mặc định
  const handleReset = () => {
    const defaultVisible = columns
      .filter(c => c.defaultVisible !== false)
      .map(c => c.key)
    onChange(defaultVisible)
    saveToStorage(defaultVisible)
  }

  // Đếm số cột đang hiển thị / tổng số
  const visibleCount = visibleColumns.length
  const totalCount = columns.length

  const content = (
    <div className="column-toggle-content">
      <div className="column-toggle-header">
        <span className="column-toggle-title">
          Hiển thị cột ({visibleCount}/{totalCount})
        </span>
        <Space size={4}>
          <Tooltip title="Hiện tất cả">
            <Button
              type="text"
              size="small"
              icon={<EyeOutlined />}
              onClick={handleShowAll}
            />
          </Tooltip>
          <Tooltip title="Ẩn tất cả">
            <Button
              type="text"
              size="small"
              icon={<EyeInvisibleOutlined />}
              onClick={handleHideAll}
            />
          </Tooltip>
        </Space>
      </div>
      <Divider style={{ margin: '8px 0' }} />
      <div className="column-toggle-list">
        {columns.map(column => (
          <div key={column.key} className="column-toggle-item">
            <Checkbox
              checked={visibleColumns.includes(column.key)}
              disabled={column.fixed}
              onChange={(e: CheckboxChangeEvent) => handleToggle(column.key, e.target.checked)}
            >
              {column.title}
              {column.fixed && (
                <span className="column-toggle-fixed-badge">Cố định</span>
              )}
            </Checkbox>
          </div>
        ))}
      </div>
      <Divider style={{ margin: '8px 0' }} />
      <div className="column-toggle-footer">
        <Button size="small" onClick={handleReset}>
          Khôi phục mặc định
        </Button>
      </div>
    </div>
  )

  return (
    <Popover
      content={content}
      trigger="click"
      open={open}
      onOpenChange={setOpen}
      placement="bottomRight"
      overlayClassName="column-toggle-popover"
    >
      <Button icon={<SettingOutlined />}>
        Cột ({visibleCount}/{totalCount})
      </Button>
    </Popover>
  )
}

export default ColumnToggle
