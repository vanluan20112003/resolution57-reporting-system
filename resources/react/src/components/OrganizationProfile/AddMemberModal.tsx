import { useState, useEffect } from 'react'
import {
  Modal,
  Tabs,
  Form,
  Input,
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
  Upload,
} from 'antd'
import {
  UserAddOutlined,
  UploadOutlined,
  DownloadOutlined,
  FileExcelOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
  InfoCircleOutlined,
  MailOutlined,
} from '@ant-design/icons'
import type { UploadFile, UploadProps } from 'antd'
import {
  addMember,
  getMemberImportTemplateInfo,
  downloadMemberImportTemplate,
  importMembers,
  MemberImportTemplateInfo,
  MemberImportResults,
} from '../../services/organizationApi'

const { Title, Text } = Typography
const { Dragger } = Upload
const { Panel } = Collapse

interface AddMemberModalProps {
  open: boolean
  onClose: () => void
  onSuccess?: () => void
}

function AddMemberModal({ open, onClose, onSuccess }: AddMemberModalProps) {
  const [activeTab, setActiveTab] = useState<'single' | 'import'>('single')
  const [form] = Form.useForm()
  const [addingMember, setAddingMember] = useState(false)

  // Import states
  const [currentStep, setCurrentStep] = useState(0)
  const [templateInfo, setTemplateInfo] = useState<MemberImportTemplateInfo | null>(null)
  const [loadingTemplate, setLoadingTemplate] = useState(false)
  const [importing, setImporting] = useState(false)
  const [fileList, setFileList] = useState<UploadFile[]>([])
  const [results, setResults] = useState<MemberImportResults | null>(null)

  // Fetch template info when import tab is active
  useEffect(() => {
    if (open && activeTab === 'import' && !templateInfo) {
      fetchTemplateInfo()
    }
  }, [open, activeTab])

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      form.resetFields()
      setActiveTab('single')
      setCurrentStep(0)
      setFileList([])
      setResults(null)
    }
  }, [open])

  const fetchTemplateInfo = async () => {
    setLoadingTemplate(true)
    try {
      const response = await getMemberImportTemplateInfo()
      setTemplateInfo(response.data)
    } catch (error: any) {
      message.error(error.message || 'Không thể tải thông tin template')
    } finally {
      setLoadingTemplate(false)
    }
  }

  const handleAddSingleMember = async () => {
    try {
      const values = await form.validateFields()
      setAddingMember(true)

      await addMember(values.email)
      message.success('Đã thêm thành viên thành công')
      form.resetFields()
      onSuccess?.()
      onClose()
    } catch (error: any) {
      if (error.errorFields) {
        return
      }
      message.error(error.message || 'Không thể thêm thành viên')
    } finally {
      setAddingMember(false)
    }
  }

  const handleDownloadTemplate = async () => {
    try {
      await downloadMemberImportTemplate()
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
      const response = await importMembers(file)
      setResults(response.data)
      setCurrentStep(3)

      if (response.data.success > 0 && onSuccess) {
        onSuccess()
      }
    } catch (error: any) {
      message.error(error.message || 'Lỗi khi import thành viên')
      setCurrentStep(1)
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

  // Render single member form
  const renderSingleForm = () => (
    <div style={{ padding: '16px 0' }}>
      <Alert
        type="info"
        showIcon
        message="Thêm thành viên mới"
        description={
          <ul style={{ marginBottom: 0, paddingLeft: 20 }}>
            <li>Nhập email của người dùng đã có tài khoản trong hệ thống</li>
            <li>Người dùng chưa thuộc về đơn vị nào</li>
            <li>Không thể thêm ADMIN hoặc OPERATOR</li>
            <li>Thành viên mới sẽ có vai trò mặc định là "Thành viên"</li>
          </ul>
        }
        style={{ marginBottom: 24 }}
      />

      <Form form={form} layout="vertical">
        <Form.Item
          name="email"
          label="Email"
          rules={[
            { required: true, message: 'Vui lòng nhập email' },
            { type: 'email', message: 'Email không hợp lệ' },
          ]}
        >
          <Input
            prefix={<MailOutlined />}
            placeholder="Nhập email của thành viên"
            size="large"
          />
        </Form.Item>
      </Form>

      <div style={{ textAlign: 'right', marginTop: 16 }}>
        <Space>
          <Button onClick={onClose}>Hủy</Button>
          <Button
            type="primary"
            icon={<UserAddOutlined />}
            onClick={handleAddSingleMember}
            loading={addingMember}
          >
            Thêm thành viên
          </Button>
        </Space>
      </div>
    </div>
  )

  // Render import step content
  const renderImportStepContent = () => {
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
                  <li>Điền danh sách email vào cột "email"</li>
                  <li>Upload file đã điền và thực hiện import</li>
                </ol>
              }
              style={{ marginBottom: 16 }}
            />

            <Alert
              type="warning"
              showIcon
              icon={<ExclamationCircleOutlined />}
              message="Lưu ý quan trọng"
              description={
                <ul style={{ marginBottom: 0, paddingLeft: 20 }}>
                  {templateInfo?.notes.map((note, idx) => (
                    <li key={idx}>{note}</li>
                  ))}
                </ul>
              }
              style={{ marginBottom: 16 }}
            />

            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <Button
                type="primary"
                icon={<DownloadOutlined />}
                onClick={handleDownloadTemplate}
                size="large"
              >
                Tải file Template mẫu
              </Button>
              <Text type="secondary" style={{ display: 'block', marginTop: 8 }}>
                File template chứa cột email và ví dụ dữ liệu
              </Text>
            </div>

            <Divider>Cấu trúc dữ liệu yêu cầu</Divider>

            {loadingTemplate ? (
              <div style={{ textAlign: 'center', padding: 40 }}>
                <Spin size="large" />
              </div>
            ) : templateInfo ? (
              <Table
                columns={templateColumns}
                dataSource={templateInfo.columns.map((col, idx) => ({ ...col, key: idx }))}
                pagination={false}
                size="small"
                bordered
              />
            ) : null}
          </div>
        )

      case 1:
        // Step 2: Upload file
        return (
          <div className="import-step-content">
            <Dragger {...uploadProps} style={{ padding: 20 }}>
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
          <div style={{ textAlign: 'center', padding: 40 }}>
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
                <div style={{ marginBottom: 24 }}>
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

                  <div style={{ display: 'flex', justifyContent: 'center', gap: 32, marginTop: 16 }}>
                    <div style={{ textAlign: 'center' }}>
                      <CheckCircleOutlined style={{ fontSize: 24, color: '#52c41a' }} />
                      <div style={{ fontSize: 24, fontWeight: 'bold' }}>{results.success}</div>
                      <div style={{ color: '#666' }}>Thành công</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <ExclamationCircleOutlined style={{ fontSize: 24, color: '#faad14' }} />
                      <div style={{ fontSize: 24, fontWeight: 'bold' }}>{results.skipped}</div>
                      <div style={{ color: '#666' }}>Bỏ qua</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <CloseCircleOutlined style={{ fontSize: 24, color: '#ff4d4f' }} />
                      <div style={{ fontSize: 24, fontWeight: 'bold' }}>{results.failed}</div>
                      <div style={{ color: '#666' }}>Lỗi</div>
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
                <Collapse>
                  {results.created.length > 0 && (
                    <Panel
                      header={
                        <Space>
                          <CheckCircleOutlined style={{ color: '#52c41a' }} />
                          <span>Đã thêm thành công ({results.created.length})</span>
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
                            title: 'Email',
                            dataIndex: ['data', 'email'],
                          },
                          {
                            title: 'Tên',
                            dataIndex: ['data', 'name'],
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
                          <span>Bỏ qua ({results.duplicates.length})</span>
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
                            title: 'Email',
                            dataIndex: ['data', 'email'],
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
                            render: (text: string) => <Text type="danger">{text}</Text>,
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

  // Render import tab
  const renderImportTab = () => (
    <div style={{ padding: '16px 0' }}>
      <Steps current={currentStep} items={steps} style={{ marginBottom: 24 }} size="small" />
      {renderImportStepContent()}

      <div style={{ textAlign: 'right', marginTop: 24 }}>
        <Space>
          {currentStep === 0 && (
            <>
              <Button onClick={onClose}>Hủy</Button>
              <Button type="primary" onClick={() => setCurrentStep(1)}>
                Tiếp tục
              </Button>
            </>
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
      </div>
    </div>
  )

  return (
    <Modal
      title={
        <Space>
          <UserAddOutlined style={{ color: '#1890ff' }} />
          <span>Thêm thành viên vào đơn vị</span>
        </Space>
      }
      open={open}
      onCancel={onClose}
      width={700}
      footer={null}
      maskClosable={currentStep !== 2}
      closable={currentStep !== 2}
    >
      <Tabs
        activeKey={activeTab}
        onChange={(key) => setActiveTab(key as 'single' | 'import')}
        items={[
          {
            key: 'single',
            label: (
              <span>
                <UserAddOutlined />
                Thêm từng người
              </span>
            ),
            children: renderSingleForm(),
          },
          {
            key: 'import',
            label: (
              <span>
                <FileExcelOutlined />
                Import từ Excel
              </span>
            ),
            children: renderImportTab(),
          },
        ]}
      />
    </Modal>
  )
}

export default AddMemberModal
