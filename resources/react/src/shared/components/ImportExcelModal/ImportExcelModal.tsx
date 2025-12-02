import { useState, useEffect } from 'react'
import {
  Modal,
  Upload,
  Button,
  Space,
  Typography,
  Table,
  Alert,
  Steps,
  Divider,
  Tag,
  Progress,
  Result,
  message,
  Spin,
  Collapse,
} from 'antd'
import {
  UploadOutlined,
  DownloadOutlined,
  FileExcelOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons'
import type { UploadFile, UploadProps } from 'antd'
import {
  ImportType,
  TemplateInfo,
  ImportResults,
  getTemplateInfo,
  downloadTemplate,
  importExcel,
  getImportTypeName,
} from '../../../services/importApi'
import './ImportExcelModal.css'

const { Title, Text, Paragraph } = Typography
const { Dragger } = Upload
const { Panel } = Collapse

interface ImportExcelModalProps {
  open: boolean
  type: ImportType
  onClose: () => void
  onSuccess?: () => void
}

function ImportExcelModal({ open, type, onClose, onSuccess }: ImportExcelModalProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [templateInfo, setTemplateInfo] = useState<TemplateInfo | null>(null)
  const [loading, setLoading] = useState(false)
  const [importing, setImporting] = useState(false)
  const [fileList, setFileList] = useState<UploadFile[]>([])
  const [results, setResults] = useState<ImportResults | null>(null)

  // Fetch template info when modal opens
  useEffect(() => {
    if (open && type) {
      fetchTemplateInfo()
    }
  }, [open, type])

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setCurrentStep(0)
      setFileList([])
      setResults(null)
    }
  }, [open])

  const fetchTemplateInfo = async () => {
    setLoading(true)
    try {
      const response = await getTemplateInfo(type)
      setTemplateInfo(response.data as TemplateInfo)
    } catch (error: any) {
      message.error(error.message || 'Không thể tải thông tin template')
    } finally {
      setLoading(false)
    }
  }

  const handleDownloadTemplate = async () => {
    try {
      await downloadTemplate(type)
      message.success('Đã tải file template')
    } catch (error: any) {
      message.error(error.message || 'Không thể tải file template')
    }
  }

  const handleImport = async () => {
    if (fileList.length === 0) {
      message.warning('Vui lòng chọn file để import')
      return
    }

    const file = fileList[0].originFileObj as File
    setImporting(true)
    setCurrentStep(2)

    try {
      const response = await importExcel(type, file)
      setResults(response.data)
      setCurrentStep(3)

      if (response.data.success > 0 && onSuccess) {
        onSuccess()
      }
    } catch (error: any) {
      message.error(error.message || 'Lỗi khi import dữ liệu')
      setCurrentStep(1) // Go back to upload step
    } finally {
      setImporting(false)
    }
  }

  const uploadProps: UploadProps = {
    accept: '.xlsx,.xls',
    maxCount: 1,
    fileList,
    beforeUpload: (file) => {
      const isExcel =
        file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        file.type === 'application/vnd.ms-excel'
      if (!isExcel) {
        message.error('Chỉ chấp nhận file Excel (.xlsx, .xls)')
        return Upload.LIST_IGNORE
      }
      const isLt10M = file.size / 1024 / 1024 < 10
      if (!isLt10M) {
        message.error('File phải nhỏ hơn 10MB')
        return Upload.LIST_IGNORE
      }
      return false
    },
    onChange: (info) => {
      setFileList(info.fileList)
    },
    onRemove: () => {
      setFileList([])
    },
  }

  // Columns for template info table
  const templateColumns = [
    {
      title: 'Tên cột',
      dataIndex: 'label',
      key: 'label',
      render: (text: string, record: any) => (
        <Space>
          <Text strong>{text}</Text>
          {record.required && <Tag color="red">Bắt buộc</Tag>}
        </Space>
      ),
    },
    {
      title: 'Mô tả',
      dataIndex: 'description',
      key: 'description',
    },
    {
      title: 'Ví dụ',
      dataIndex: 'example',
      key: 'example',
      render: (text: string) => <Text code>{text}</Text>,
    },
  ]

  // Render step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        // Step 1: Template info
        return (
          <div className="import-step-content">
            <Alert
              type="info"
              showIcon
              icon={<InfoCircleOutlined />}
              message="Hướng dẫn import"
              description={
                <ol style={{ marginBottom: 0, paddingLeft: 20 }}>
                  <li>Tải file template mẫu bên dưới</li>
                  <li>Điền dữ liệu vào file theo đúng format</li>
                  <li>Upload file đã điền và thực hiện import</li>
                </ol>
              }
              style={{ marginBottom: 16 }}
            />

            {type === 'users' && (
              <Alert
                type="warning"
                showIcon
                icon={<ExclamationCircleOutlined />}
                message="Lưu ý về mật khẩu"
                description={
                  <span>
                    Tất cả người dùng được import sẽ có <Text strong>mật khẩu mặc định là: 123456</Text>.
                    Vui lòng thông báo để người dùng đổi mật khẩu sau khi đăng nhập lần đầu.
                  </span>
                }
                style={{ marginBottom: 16 }}
              />
            )}

            <div className="template-download-section">
              <Button
                type="primary"
                icon={<DownloadOutlined />}
                onClick={handleDownloadTemplate}
                size="large"
              >
                Tải file Template mẫu
              </Button>
              <Text type="secondary" style={{ display: 'block', marginTop: 8 }}>
                File template chứa các cột và ví dụ dữ liệu
              </Text>
            </div>

            <Divider>Cấu trúc dữ liệu yêu cầu</Divider>

            {loading ? (
              <div style={{ textAlign: 'center', padding: 40 }}>
                <Spin size="large" />
              </div>
            ) : templateInfo ? (
              <>
                <Table
                  columns={templateColumns}
                  dataSource={templateInfo.columns.map((col, idx) => ({ ...col, key: idx }))}
                  pagination={false}
                  size="small"
                  bordered
                />
                {templateInfo.unique_fields.length > 0 && (
                  <Alert
                    type="warning"
                    showIcon
                    message="Lưu ý về trùng lặp"
                    description={
                      <span>
                        Các trường sau phải là duy nhất trong hệ thống:{' '}
                        <Text strong>{templateInfo.unique_fields.join(', ')}</Text>. Các dòng có
                        giá trị trùng sẽ bị bỏ qua.
                      </span>
                    }
                    style={{ marginTop: 16 }}
                  />
                )}
              </>
            ) : null}
          </div>
        )

      case 1:
        // Step 2: Upload file
        return (
          <div className="import-step-content">
            <Dragger {...uploadProps} className="import-uploader">
              <p className="ant-upload-drag-icon">
                <FileExcelOutlined style={{ color: '#52c41a', fontSize: 48 }} />
              </p>
              <p className="ant-upload-text">Kéo thả file Excel vào đây hoặc click để chọn file</p>
              <p className="ant-upload-hint">Chỉ hỗ trợ file .xlsx hoặc .xls (tối đa 10MB)</p>
            </Dragger>

            {fileList.length > 0 && (
              <div style={{ marginTop: 24, textAlign: 'center' }}>
                <Button
                  type="primary"
                  size="large"
                  icon={<UploadOutlined />}
                  onClick={handleImport}
                  loading={importing}
                >
                  Bắt đầu Import
                </Button>
              </div>
            )}
          </div>
        )

      case 2:
        // Step 3: Processing
        return (
          <div className="import-step-content" style={{ textAlign: 'center', padding: 40 }}>
            <Spin size="large" />
            <Title level={4} style={{ marginTop: 24 }}>
              Đang xử lý import...
            </Title>
            <Text type="secondary">Vui lòng không đóng cửa sổ này</Text>
          </div>
        )

      case 3:
        // Step 4: Results
        return (
          <div className="import-step-content">
            {results && (
              <>
                <div className="import-results-summary">
                  <Result
                    status={results.failed === 0 ? 'success' : results.success > 0 ? 'warning' : 'error'}
                    title={
                      results.failed === 0
                        ? 'Import thành công!'
                        : results.success > 0
                        ? 'Import hoàn tất với một số lỗi'
                        : 'Import thất bại'
                    }
                    subTitle={`Đã xử lý ${results.total} dòng dữ liệu`}
                  />

                  <div className="import-stats">
                    <div className="import-stat success">
                      <CheckCircleOutlined />
                      <span className="stat-value">{results.success}</span>
                      <span className="stat-label">Thành công</span>
                    </div>
                    <div className="import-stat warning">
                      <ExclamationCircleOutlined />
                      <span className="stat-value">{results.skipped}</span>
                      <span className="stat-label">Bỏ qua (trùng)</span>
                    </div>
                    <div className="import-stat error">
                      <CloseCircleOutlined />
                      <span className="stat-value">{results.failed}</span>
                      <span className="stat-label">Lỗi</span>
                    </div>
                  </div>

                  <Progress
                    percent={Math.round((results.success / results.total) * 100)}
                    success={{ percent: Math.round((results.success / results.total) * 100) }}
                    status={results.failed > 0 ? 'exception' : 'success'}
                    style={{ marginTop: 16 }}
                  />
                </div>

                {/* Details */}
                <Collapse style={{ marginTop: 24 }}>
                  {results.created.length > 0 && (
                    <Panel
                      header={
                        <Space>
                          <CheckCircleOutlined style={{ color: '#52c41a' }} />
                          <span>Đã tạo thành công ({results.created.length})</span>
                        </Space>
                      }
                      key="created"
                    >
                      <Table
                        size="small"
                        pagination={{ pageSize: 5 }}
                        dataSource={results.created.map((item, idx) => ({ ...item, key: idx }))}
                        columns={[
                          { title: 'Dòng', dataIndex: 'row', width: 60 },
                          {
                            title: 'Dữ liệu',
                            dataIndex: 'data',
                            render: (data) => (
                              <Text>{Object.values(data).filter(Boolean).join(' - ')}</Text>
                            ),
                          },
                        ]}
                      />
                    </Panel>
                  )}

                  {results.duplicates.length > 0 && (
                    <Panel
                      header={
                        <Space>
                          <ExclamationCircleOutlined style={{ color: '#faad14' }} />
                          <span>Bỏ qua do trùng ({results.duplicates.length})</span>
                        </Space>
                      }
                      key="duplicates"
                    >
                      <Table
                        size="small"
                        pagination={{ pageSize: 5 }}
                        dataSource={results.duplicates.map((item, idx) => ({ ...item, key: idx }))}
                        columns={[
                          { title: 'Dòng', dataIndex: 'row', width: 60 },
                          { title: 'Lý do', dataIndex: 'message' },
                          {
                            title: 'Dữ liệu',
                            dataIndex: 'data',
                            render: (data) => (
                              <Text>{Object.values(data).filter(Boolean).slice(0, 3).join(' - ')}</Text>
                            ),
                          },
                        ]}
                      />
                    </Panel>
                  )}

                  {results.errors.length > 0 && (
                    <Panel
                      header={
                        <Space>
                          <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
                          <span>Lỗi ({results.errors.length})</span>
                        </Space>
                      }
                      key="errors"
                    >
                      <Table
                        size="small"
                        pagination={{ pageSize: 5 }}
                        dataSource={results.errors.map((item, idx) => ({ ...item, key: idx }))}
                        columns={[
                          { title: 'Dòng', dataIndex: 'row', width: 60 },
                          {
                            title: 'Lỗi',
                            dataIndex: 'message',
                            render: (text) => <Text type="danger">{text}</Text>,
                          },
                        ]}
                      />
                    </Panel>
                  )}
                </Collapse>
              </>
            )}
          </div>
        )

      default:
        return null
    }
  }

  const steps = [
    { title: 'Hướng dẫn', icon: <InfoCircleOutlined /> },
    { title: 'Upload file', icon: <UploadOutlined /> },
    { title: 'Xử lý', icon: <FileExcelOutlined /> },
    { title: 'Kết quả', icon: <CheckCircleOutlined /> },
  ]

  return (
    <Modal
      title={
        <Space>
          <FileExcelOutlined style={{ color: '#52c41a' }} />
          <span>Import {getImportTypeName(type)} từ Excel</span>
        </Space>
      }
      open={open}
      onCancel={onClose}
      width={800}
      footer={
        <Space>
          {currentStep === 0 && (
            <Button type="primary" onClick={() => setCurrentStep(1)}>
              Tiếp tục
            </Button>
          )}
          {currentStep === 1 && (
            <>
              <Button onClick={() => setCurrentStep(0)}>Quay lại</Button>
              <Button
                type="primary"
                onClick={handleImport}
                disabled={fileList.length === 0}
                loading={importing}
              >
                Bắt đầu Import
              </Button>
            </>
          )}
          {currentStep === 3 && (
            <Button type="primary" onClick={onClose}>
              Đóng
            </Button>
          )}
        </Space>
      }
      maskClosable={false}
      closable={currentStep !== 2}
    >
      <Steps current={currentStep} items={steps} style={{ marginBottom: 24 }} />
      {renderStepContent()}
    </Modal>
  )
}

export default ImportExcelModal
