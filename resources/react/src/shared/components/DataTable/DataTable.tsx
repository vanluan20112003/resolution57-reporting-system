import { useState, useEffect } from 'react'
import { Card, Table, List, Segmented } from 'antd'
import { AppstoreOutlined, UnorderedListOutlined } from '@ant-design/icons'
import type { ColumnsType, TableProps } from 'antd/es/table'

export type DisplayMode = 'table' | 'card'

interface DataTableProps<T> {
  columns: ColumnsType<T>
  dataSource: T[]
  rowKey: string
  displayMode?: DisplayMode
  onDisplayModeChange?: (mode: DisplayMode) => void
  showDisplayToggle?: boolean
  tableProps?: Omit<TableProps<T>, 'columns' | 'dataSource' | 'rowKey'>
  cardRenderer?: (item: T) => React.ReactNode
  cardGridProps?: {
    gutter?: number
    xs?: number
    sm?: number
    md?: number
    lg?: number
    xl?: number
    xxl?: number
  }
  localStorageKey?: string
}

function DataTable<T extends Record<string, any>>({
  columns,
  dataSource,
  rowKey,
  displayMode: externalDisplayMode,
  onDisplayModeChange,
  showDisplayToggle = true,
  tableProps = {},
  cardRenderer,
  cardGridProps = { gutter: 16, xs: 1, sm: 1, md: 2, lg: 2, xl: 3, xxl: 3 },
  localStorageKey = 'dataTableDisplayMode',
}: DataTableProps<T>) {
  const [internalDisplayMode, setInternalDisplayMode] = useState<DisplayMode>('table')

  // Load display mode from localStorage on mount
  useEffect(() => {
    if (externalDisplayMode === undefined) {
      const savedMode = localStorage.getItem(localStorageKey)
      if (savedMode === 'card' || savedMode === 'table') {
        setInternalDisplayMode(savedMode)
      }
    }
  }, [externalDisplayMode, localStorageKey])

  // Use external or internal display mode
  const currentDisplayMode = externalDisplayMode ?? internalDisplayMode

  // Handle display mode change
  const handleDisplayModeChange = (mode: DisplayMode) => {
    if (onDisplayModeChange) {
      onDisplayModeChange(mode)
    } else {
      setInternalDisplayMode(mode)
      localStorage.setItem(localStorageKey, mode)
    }
  }

  // Default table props
  const defaultTableProps: TableProps<T> = {
    pagination: {
      pageSize: 20,
      showSizeChanger: true,
      showTotal: (total) => `Tổng ${total} bản ghi`,
    },
    scroll: { x: 1200 },
    bordered: true,
    ...tableProps,
  }

  return (
    <>
      {/* Display Mode Toggle */}
      {showDisplayToggle && (
        <Card style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Segmented
              value={currentDisplayMode}
              onChange={handleDisplayModeChange}
              options={[
                {
                  label: 'Danh sách',
                  value: 'table',
                  icon: <UnorderedListOutlined />,
                },
                {
                  label: 'Thẻ',
                  value: 'card',
                  icon: <AppstoreOutlined />,
                },
              ]}
            />
          </div>
        </Card>
      )}

      {/* Table View */}
      {currentDisplayMode === 'table' && (
        <Table<T>
          columns={columns}
          dataSource={dataSource}
          rowKey={rowKey}
          {...defaultTableProps}
        />
      )}

      {/* Card View */}
      {currentDisplayMode === 'card' && cardRenderer && (
        <List
          grid={cardGridProps}
          dataSource={dataSource}
          pagination={{
            pageSize: 12,
            showSizeChanger: true,
            showTotal: (total) => `Tổng ${total} bản ghi`,
          }}
          renderItem={cardRenderer}
        />
      )}
    </>
  )
}

export default DataTable
