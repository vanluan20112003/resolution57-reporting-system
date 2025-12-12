/**
 * Mobile Date Range Picker Component
 * iOS-style wheel picker for selecting date ranges on mobile devices
 */

import { useState, useEffect } from 'react'
import { Modal, Button, Segmented } from 'antd'
import { CalendarOutlined, SwapRightOutlined } from '@ant-design/icons'
import dayjs, { Dayjs } from 'dayjs'
import './MobileDatePicker.css'

interface MobileDateRangePickerProps {
  value?: [Dayjs | null, Dayjs | null] | null
  onChange?: (dates: [Dayjs, Dayjs] | null) => void
  placeholder?: [string, string]
  format?: string
  allowClear?: boolean
  disabled?: boolean
}

interface WheelColumnProps {
  items: { value: number; label: string }[]
  value: number
  onChange: (value: number) => void
  itemHeight?: number
}

// Reuse wheel column from MobileDatePicker
function WheelColumn({ items, value, onChange, itemHeight = 44 }: WheelColumnProps) {
  const containerRef = React.useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const startYRef = React.useRef(0)
  const startScrollRef = React.useRef(0)
  const velocityRef = React.useRef(0)
  const lastYRef = React.useRef(0)
  const lastTimeRef = React.useRef(0)
  const animationRef = React.useRef<number>()

  const visibleItems = 5
  const containerHeight = itemHeight * visibleItems

  const currentIndex = items.findIndex(item => item.value === value)

  const scrollToIndex = React.useCallback((index: number, smooth = true) => {
    if (containerRef.current) {
      const scrollTop = index * itemHeight
      if (smooth) {
        containerRef.current.scrollTo({ top: scrollTop, behavior: 'smooth' })
      } else {
        containerRef.current.scrollTop = scrollTop
      }
    }
  }, [itemHeight])

  useEffect(() => {
    if (currentIndex >= 0) {
      scrollToIndex(currentIndex, false)
    }
  }, [currentIndex, scrollToIndex])

  const handleScrollEnd = React.useCallback(() => {
    if (containerRef.current) {
      const scrollTop = containerRef.current.scrollTop
      const nearestIndex = Math.round(scrollTop / itemHeight)
      const clampedIndex = Math.max(0, Math.min(items.length - 1, nearestIndex))

      scrollToIndex(clampedIndex)

      if (items[clampedIndex] && items[clampedIndex].value !== value) {
        onChange(items[clampedIndex].value)
      }
    }
  }, [itemHeight, items, value, onChange, scrollToIndex])

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true)
    startYRef.current = e.touches[0].clientY
    startScrollRef.current = containerRef.current?.scrollTop || 0
    lastYRef.current = e.touches[0].clientY
    lastTimeRef.current = Date.now()
    velocityRef.current = 0

    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
    }
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || !containerRef.current) return

    const currentY = e.touches[0].clientY
    const diff = startYRef.current - currentY
    containerRef.current.scrollTop = startScrollRef.current + diff

    const now = Date.now()
    const dt = now - lastTimeRef.current
    if (dt > 0) {
      velocityRef.current = (lastYRef.current - currentY) / dt
    }
    lastYRef.current = currentY
    lastTimeRef.current = now
  }

  const handleTouchEnd = () => {
    setIsDragging(false)

    if (Math.abs(velocityRef.current) > 0.5 && containerRef.current) {
      const momentum = velocityRef.current * 150
      const targetScroll = containerRef.current.scrollTop + momentum
      const targetIndex = Math.round(targetScroll / itemHeight)
      const clampedIndex = Math.max(0, Math.min(items.length - 1, targetIndex))

      scrollToIndex(clampedIndex)

      setTimeout(() => {
        if (items[clampedIndex] && items[clampedIndex].value !== value) {
          onChange(items[clampedIndex].value)
        }
      }, 300)
    } else {
      handleScrollEnd()
    }
  }

  const handleItemClick = (index: number) => {
    scrollToIndex(index)
    if (items[index] && items[index].value !== value) {
      onChange(items[index].value)
    }
  }

  return (
    <div className="wheel-column">
      <div className="wheel-highlight" style={{ height: itemHeight }} />
      <div
        ref={containerRef}
        className="wheel-scroll-container"
        style={{ height: containerHeight }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onScroll={() => {
          if (!isDragging) {
            if (animationRef.current) {
              cancelAnimationFrame(animationRef.current)
            }
            animationRef.current = requestAnimationFrame(() => {
              setTimeout(handleScrollEnd, 100)
            })
          }
        }}
      >
        <div style={{ height: itemHeight * 2 }} />
        {items.map((item, index) => (
          <div
            key={item.value}
            className={`wheel-item ${item.value === value ? 'selected' : ''}`}
            style={{ height: itemHeight }}
            onClick={() => handleItemClick(index)}
          >
            {item.label}
          </div>
        ))}
        <div style={{ height: itemHeight * 2 }} />
      </div>
    </div>
  )
}

import React from 'react'

export default function MobileDateRangePicker({
  value,
  onChange,
  placeholder = ['Từ ngày', 'Đến ngày'],
  format = 'DD/MM/YYYY',
  allowClear = true,
  disabled = false,
}: MobileDateRangePickerProps) {
  const [open, setOpen] = useState(false)
  const [activeField, setActiveField] = useState<'start' | 'end'>('start')

  const [startDate, setStartDate] = useState<{ day: number; month: number; year: number }>({
    day: value?.[0]?.date() || dayjs().date(),
    month: (value?.[0]?.month() || dayjs().month()) + 1,
    year: value?.[0]?.year() || dayjs().year(),
  })

  const [endDate, setEndDate] = useState<{ day: number; month: number; year: number }>({
    day: value?.[1]?.date() || dayjs().date(),
    month: (value?.[1]?.month() || dayjs().month()) + 1,
    year: value?.[1]?.year() || dayjs().year(),
  })

  // Update temp dates when value changes
  useEffect(() => {
    if (value?.[0]) {
      setStartDate({
        day: value[0].date(),
        month: value[0].month() + 1,
        year: value[0].year(),
      })
    }
    if (value?.[1]) {
      setEndDate({
        day: value[1].date(),
        month: value[1].month() + 1,
        year: value[1].year(),
      })
    }
  }, [value])

  // Generate options
  const currentYear = dayjs().year()
  const years = Array.from({ length: 20 }, (_, i) => ({
    value: currentYear - 10 + i,
    label: `${currentYear - 10 + i}`,
  }))

  const months = Array.from({ length: 12 }, (_, i) => ({
    value: i + 1,
    label: `T${i + 1}`,
  }))

  const currentDate = activeField === 'start' ? startDate : endDate
  const setCurrentDate = activeField === 'start' ? setStartDate : setEndDate

  const daysInMonth = dayjs(`${currentDate.year}-${currentDate.month}-01`).daysInMonth()
  const days = Array.from({ length: daysInMonth }, (_, i) => ({
    value: i + 1,
    label: `${i + 1}`,
  }))

  // Adjust day if it exceeds days in month
  useEffect(() => {
    if (currentDate.day > daysInMonth) {
      setCurrentDate(prev => ({ ...prev, day: daysInMonth }))
    }
  }, [currentDate.month, currentDate.year, daysInMonth])

  const handleConfirm = () => {
    const start = dayjs(`${startDate.year}-${startDate.month}-${startDate.day}`)
    let end = dayjs(`${endDate.year}-${endDate.month}-${endDate.day}`)

    // Ensure end date is not before start date
    if (end.isBefore(start)) {
      end = start
    }

    onChange?.([start, end])
    setOpen(false)
  }

  const handleClear = () => {
    onChange?.(null)
    setOpen(false)
  }

  const handleCancel = () => {
    // Reset to original value
    if (value?.[0]) {
      setStartDate({
        day: value[0].date(),
        month: value[0].month() + 1,
        year: value[0].year(),
      })
    }
    if (value?.[1]) {
      setEndDate({
        day: value[1].date(),
        month: value[1].month() + 1,
        year: value[1].year(),
      })
    }
    setOpen(false)
  }

  const startDisplayValue = value?.[0] ? value[0].format(format) : ''
  const endDisplayValue = value?.[1] ? value[1].format(format) : ''

  return (
    <>
      <div
        className={`mobile-date-range-picker-input ${disabled ? 'disabled' : ''}`}
        onClick={() => !disabled && setOpen(true)}
      >
        <CalendarOutlined className="picker-icon" />
        <div className="picker-range-values">
          <span className={`picker-value ${!value?.[0] ? 'placeholder' : ''}`}>
            {startDisplayValue || placeholder[0]}
          </span>
          <SwapRightOutlined className="range-separator" />
          <span className={`picker-value ${!value?.[1] ? 'placeholder' : ''}`}>
            {endDisplayValue || placeholder[1]}
          </span>
        </div>
        {allowClear && (value?.[0] || value?.[1]) && !disabled && (
          <span
            className="picker-clear"
            onClick={(e) => {
              e.stopPropagation()
              onChange?.(null)
            }}
          >
            ×
          </span>
        )}
      </div>

      <Modal
        open={open}
        onCancel={handleCancel}
        footer={null}
        closable={false}
        centered
        className="mobile-date-picker-modal"
        maskClosable={true}
        width="100%"
        style={{ maxWidth: '100vw', margin: 0, padding: 0 }}
        styles={{
          content: { borderRadius: '16px 16px 0 0' },
          body: { padding: 0 }
        }}
        wrapClassName="mobile-date-picker-wrap"
      >
        <div className="mobile-date-picker-content">
          {/* Header */}
          <div className="picker-header">
            <Button type="text" onClick={handleCancel}>
              Hủy
            </Button>
            <span className="picker-title">Chọn khoảng thời gian</span>
            <Button type="text" onClick={handleConfirm} className="confirm-btn">
              Xong
            </Button>
          </div>

          {/* Tab selector */}
          <div className="range-tab-selector">
            <Segmented
              block
              value={activeField}
              onChange={(val) => setActiveField(val as 'start' | 'end')}
              options={[
                {
                  value: 'start',
                  label: (
                    <div className="range-tab">
                      <span className="tab-label">Từ ngày</span>
                      <span className="tab-value">
                        {dayjs(`${startDate.year}-${startDate.month}-${startDate.day}`).format('DD/MM/YYYY')}
                      </span>
                    </div>
                  ),
                },
                {
                  value: 'end',
                  label: (
                    <div className="range-tab">
                      <span className="tab-label">Đến ngày</span>
                      <span className="tab-value">
                        {dayjs(`${endDate.year}-${endDate.month}-${endDate.day}`).format('DD/MM/YYYY')}
                      </span>
                    </div>
                  ),
                },
              ]}
            />
          </div>

          {/* Wheel Picker */}
          <div className="wheel-picker">
            <WheelColumn
              items={days}
              value={currentDate.day}
              onChange={(day) => setCurrentDate(prev => ({ ...prev, day }))}
            />
            <WheelColumn
              items={months}
              value={currentDate.month}
              onChange={(month) => setCurrentDate(prev => ({ ...prev, month }))}
            />
            <WheelColumn
              items={years}
              value={currentDate.year}
              onChange={(year) => setCurrentDate(prev => ({ ...prev, year }))}
            />
          </div>

          {/* Footer */}
          {allowClear && (
            <div className="picker-footer">
              <Button type="text" danger onClick={handleClear}>
                Xóa khoảng thời gian
              </Button>
            </div>
          )}
        </div>
      </Modal>
    </>
  )
}
