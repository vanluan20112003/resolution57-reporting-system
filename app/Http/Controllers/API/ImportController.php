<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Organization;
use App\Models\Kpi;
use App\Models\ActivityType;
use App\Models\ActivityField;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Shuchkin\SimpleXLSX;
use Shuchkin\SimpleXLSXGen;

class ImportController extends Controller
{
    /**
     * Get import template info for a specific type
     */
    public function getTemplateInfo(Request $request)
    {
        $type = $request->query('type');

        $templates = [
            'users' => [
                'name' => 'Người dùng',
                'filename' => 'import_users_template.xlsx',
                'columns' => [
                    ['field' => 'email', 'label' => 'Email', 'required' => true, 'description' => 'Email người dùng (duy nhất)', 'example' => 'user@example.com'],
                    ['field' => 'first_name', 'label' => 'Họ', 'required' => true, 'description' => 'Họ và tên đệm', 'example' => 'Nguyễn Văn'],
                    ['field' => 'last_name', 'label' => 'Tên', 'required' => true, 'description' => 'Tên', 'example' => 'An'],
                    ['field' => 'phone', 'label' => 'Số điện thoại', 'required' => false, 'description' => 'Số điện thoại', 'example' => '0901234567'],
                    ['field' => 'employee_id', 'label' => 'Mã nhân viên', 'required' => false, 'description' => 'Mã nhân viên nội bộ', 'example' => 'NV001'],
                    ['field' => 'role', 'label' => 'Vai trò', 'required' => true, 'description' => 'Vai trò: GUEST, STAFF, MANAGER, OPERATOR, ADMIN', 'example' => 'STAFF'],
                    ['field' => 'organization_code', 'label' => 'Mã đơn vị', 'required' => false, 'description' => 'Mã đơn vị người dùng thuộc về', 'example' => 'KHTN'],
                    ['field' => 'is_vnuhcm', 'label' => 'Thuộc ĐHQG', 'required' => false, 'description' => '1 = Có, 0 = Không', 'example' => '1'],
                    ['field' => 'status', 'label' => 'Trạng thái', 'required' => false, 'description' => 'active, inactive, pending', 'example' => 'active'],
                ],
                'unique_fields' => ['email'],
            ],
            'organizations' => [
                'name' => 'Đơn vị',
                'filename' => 'import_organizations_template.xlsx',
                'columns' => [
                    ['field' => 'code', 'label' => 'Mã đơn vị', 'required' => true, 'description' => 'Mã đơn vị (duy nhất)', 'example' => 'KHTN'],
                    ['field' => 'name', 'label' => 'Tên đầy đủ', 'required' => true, 'description' => 'Tên đầy đủ của đơn vị', 'example' => 'Trường Đại học Khoa học Tự nhiên'],
                    ['field' => 'short_name', 'label' => 'Tên viết tắt', 'required' => false, 'description' => 'Tên viết tắt', 'example' => 'KHTN'],
                    ['field' => 'type', 'label' => 'Loại đơn vị', 'required' => true, 'description' => 'UNIVERSITY_SYSTEM, UNIVERSITY, RESEARCH_INSTITUTE, CENTER, DEPARTMENT, EXTERNAL', 'example' => 'UNIVERSITY'],
                    ['field' => 'parent_code', 'label' => 'Mã đơn vị cha', 'required' => false, 'description' => 'Mã đơn vị cấp trên', 'example' => 'VNU'],
                    ['field' => 'is_vnuhcm', 'label' => 'Thuộc ĐHQG', 'required' => false, 'description' => '1 = Có, 0 = Không', 'example' => '1'],
                    ['field' => 'contact_email', 'label' => 'Email liên hệ', 'required' => false, 'description' => 'Email liên hệ đơn vị', 'example' => 'contact@hcmus.edu.vn'],
                    ['field' => 'contact_phone', 'label' => 'Điện thoại', 'required' => false, 'description' => 'Số điện thoại liên hệ', 'example' => '028 38 353 193'],
                    ['field' => 'address', 'label' => 'Địa chỉ', 'required' => false, 'description' => 'Địa chỉ đơn vị', 'example' => '227 Nguyễn Văn Cừ, Q.5, TP.HCM'],
                    ['field' => 'website', 'label' => 'Website', 'required' => false, 'description' => 'Website đơn vị', 'example' => 'https://hcmus.edu.vn'],
                    ['field' => 'description', 'label' => 'Mô tả', 'required' => false, 'description' => 'Mô tả về đơn vị', 'example' => 'Trường thành viên ĐHQG-HCM'],
                    ['field' => 'display_order', 'label' => 'Thứ tự hiển thị', 'required' => false, 'description' => 'Số thứ tự sắp xếp', 'example' => '1'],
                    ['field' => 'status', 'label' => 'Trạng thái', 'required' => false, 'description' => 'active, inactive', 'example' => 'active'],
                ],
                'unique_fields' => ['code'],
            ],
            'kpis' => [
                'name' => 'Chỉ tiêu KPI',
                'filename' => 'import_kpis_template.xlsx',
                'columns' => [
                    ['field' => 'source', 'label' => 'Nguồn', 'required' => true, 'description' => 'CENTRAL (Trung ương) hoặc VNU (ĐHQG-HCM)', 'example' => 'VNU'],
                    ['field' => 'code', 'label' => 'Mã KPI', 'required' => true, 'description' => 'Mã chỉ tiêu (duy nhất)', 'example' => 'KPI-001'],
                    ['field' => 'title', 'label' => 'Tên chỉ tiêu', 'required' => true, 'description' => 'Tên đầy đủ của chỉ tiêu', 'example' => 'Số lượng bài báo quốc tế'],
                    ['field' => 'description', 'label' => 'Mô tả', 'required' => false, 'description' => 'Mô tả chi tiết về chỉ tiêu', 'example' => 'Số bài báo đăng trên tạp chí quốc tế uy tín'],
                    ['field' => 'category', 'label' => 'Danh mục', 'required' => false, 'description' => 'Phân loại chỉ tiêu', 'example' => 'Nghiên cứu khoa học'],
                    ['field' => 'order_number', 'label' => 'Số thứ tự', 'required' => false, 'description' => 'Thứ tự sắp xếp', 'example' => '1'],
                    ['field' => 'is_active', 'label' => 'Kích hoạt', 'required' => false, 'description' => '1 = Có, 0 = Không', 'example' => '1'],
                ],
                'unique_fields' => ['code'],
            ],
            'activity_types' => [
                'name' => 'Loại hoạt động',
                'filename' => 'import_activity_types_template.xlsx',
                'columns' => [
                    ['field' => 'name', 'label' => 'Tên loại hoạt động', 'required' => true, 'description' => 'Tên loại hoạt động (duy nhất)', 'example' => 'Hội thảo khoa học'],
                    ['field' => 'description', 'label' => 'Mô tả', 'required' => false, 'description' => 'Mô tả về loại hoạt động', 'example' => 'Các hội thảo, hội nghị khoa học'],
                    ['field' => 'display_order', 'label' => 'Thứ tự hiển thị', 'required' => false, 'description' => 'Số thứ tự sắp xếp', 'example' => '1'],
                    ['field' => 'is_active', 'label' => 'Kích hoạt', 'required' => false, 'description' => '1 = Có, 0 = Không', 'example' => '1'],
                ],
                'unique_fields' => ['name'],
            ],
            'activity_fields' => [
                'name' => 'Lĩnh vực hoạt động',
                'filename' => 'import_activity_fields_template.xlsx',
                'columns' => [
                    ['field' => 'name', 'label' => 'Tên lĩnh vực', 'required' => true, 'description' => 'Tên lĩnh vực (duy nhất)', 'example' => 'Nghiên cứu khoa học'],
                    ['field' => 'description', 'label' => 'Mô tả', 'required' => false, 'description' => 'Mô tả về lĩnh vực', 'example' => 'Các hoạt động nghiên cứu khoa học'],
                    ['field' => 'display_order', 'label' => 'Thứ tự hiển thị', 'required' => false, 'description' => 'Số thứ tự sắp xếp', 'example' => '1'],
                    ['field' => 'is_active', 'label' => 'Kích hoạt', 'required' => false, 'description' => '1 = Có, 0 = Không', 'example' => '1'],
                ],
                'unique_fields' => ['name'],
            ],
        ];

        if ($type && isset($templates[$type])) {
            return response()->json([
                'success' => true,
                'data' => $templates[$type],
            ]);
        }

        return response()->json([
            'success' => true,
            'data' => $templates,
        ]);
    }

    /**
     * Download import template
     */
    public function downloadTemplate(Request $request)
    {
        $type = $request->query('type');
        $templateInfo = $this->getTemplateData($type);

        if (!$templateInfo) {
            return response()->json([
                'success' => false,
                'message' => 'Loại template không hợp lệ',
            ], 400);
        }

        // Build rows for template
        $headerRow = [];
        $descriptionRow = [];
        $exampleRow = [];

        foreach ($templateInfo['columns'] as $column) {
            $headerRow[] = $column['label'] . ($column['required'] ? ' *' : '');
            $descriptionRow[] = $column['description'];
            $exampleRow[] = $column['example'];
        }

        $rows = [
            $headerRow,
            $descriptionRow,
            $exampleRow,
            [], // Empty row for separation
            ['* Các trường có dấu * là bắt buộc'],
            ['Dòng 2: Mô tả trường | Dòng 3: Ví dụ | Dữ liệu bắt đầu từ dòng 4'],
        ];

        $xlsx = SimpleXLSXGen::fromArray($rows);
        $filename = $templateInfo['filename'];

        return response()->streamDownload(function () use ($xlsx) {
            echo $xlsx;
        }, $filename, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ]);
    }

    /**
     * Import data from Excel file
     */
    public function import(Request $request)
    {
        $request->validate([
            'file' => 'required|file|mimes:xlsx,xls',
            'type' => 'required|in:users,organizations,kpis,activity_types,activity_fields',
        ]);

        $type = $request->input('type');
        $file = $request->file('file');
        $templateInfo = $this->getTemplateData($type);

        if (!$templateInfo) {
            return response()->json([
                'success' => false,
                'message' => 'Loại import không hợp lệ',
            ], 400);
        }

        try {
            $xlsx = SimpleXLSX::parse($file->getPathname());

            if (!$xlsx) {
                return response()->json([
                    'success' => false,
                    'message' => 'Không thể đọc file Excel: ' . SimpleXLSX::parseError(),
                ], 400);
            }

            $rows = $xlsx->rows();

            // Remove header rows (first 3 rows: header, description, example)
            $dataRows = \array_slice($rows, 3);

            // Filter out empty rows
            $dataRows = array_filter($dataRows, function($row) {
                return !empty(array_filter($row, fn($cell) => $cell !== null && $cell !== ''));
            });

            if (empty($dataRows)) {
                return response()->json([
                    'success' => false,
                    'message' => 'File không có dữ liệu để import',
                ], 400);
            }

            $results = $this->processImport($type, $templateInfo, $dataRows);

            return response()->json([
                'success' => true,
                'message' => 'Import hoàn tất',
                'data' => $results,
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Lỗi khi đọc file: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Process import based on type
     */
    private function processImport(string $type, array $templateInfo, array $rows): array
    {
        $results = [
            'total' => count($rows),
            'success' => 0,
            'failed' => 0,
            'skipped' => 0,
            'errors' => [],
            'created' => [],
            'duplicates' => [],
        ];

        $columns = array_column($templateInfo['columns'], 'field');

        foreach ($rows as $index => $row) {
            $rowNumber = $index + 4; // Account for 3 header rows
            $data = [];

            // Map row data to column names
            foreach ($columns as $colIndex => $field) {
                $data[$field] = isset($row[$colIndex]) ? trim((string)$row[$colIndex]) : null;
            }

            try {
                $result = match($type) {
                    'users' => $this->importUser($data, $rowNumber),
                    'organizations' => $this->importOrganization($data, $rowNumber),
                    'kpis' => $this->importKpi($data, $rowNumber),
                    'activity_types' => $this->importActivityType($data, $rowNumber),
                    'activity_fields' => $this->importActivityField($data, $rowNumber),
                };

                if ($result['status'] === 'created') {
                    $results['success']++;
                    $results['created'][] = $result;
                } elseif ($result['status'] === 'duplicate') {
                    $results['skipped']++;
                    $results['duplicates'][] = $result;
                } elseif ($result['status'] === 'error') {
                    $results['failed']++;
                    $results['errors'][] = $result;
                }
            } catch (\Exception $e) {
                $results['failed']++;
                $results['errors'][] = [
                    'row' => $rowNumber,
                    'status' => 'error',
                    'message' => $e->getMessage(),
                    'data' => $data,
                ];
            }
        }

        return $results;
    }

    /**
     * Import single user
     */
    private function importUser(array $data, int $rowNumber): array
    {
        // Validate required fields
        $errors = [];
        if (empty($data['email'])) $errors[] = 'Email là bắt buộc';
        if (empty($data['first_name'])) $errors[] = 'Họ là bắt buộc';
        if (empty($data['last_name'])) $errors[] = 'Tên là bắt buộc';
        if (empty($data['role'])) $errors[] = 'Vai trò là bắt buộc';

        if (!empty($errors)) {
            return [
                'row' => $rowNumber,
                'status' => 'error',
                'message' => implode(', ', $errors),
                'data' => $data,
            ];
        }

        // Validate email format
        if (!filter_var($data['email'], FILTER_VALIDATE_EMAIL)) {
            return [
                'row' => $rowNumber,
                'status' => 'error',
                'message' => 'Email không hợp lệ',
                'data' => $data,
            ];
        }

        // Validate role
        $validRoles = ['GUEST', 'STAFF', 'MANAGER', 'OPERATOR', 'ADMIN'];
        if (!in_array(strtoupper($data['role']), $validRoles)) {
            return [
                'row' => $rowNumber,
                'status' => 'error',
                'message' => 'Vai trò không hợp lệ. Phải là: ' . implode(', ', $validRoles),
                'data' => $data,
            ];
        }

        // Check duplicate email
        if (User::where('email', $data['email'])->exists()) {
            return [
                'row' => $rowNumber,
                'status' => 'duplicate',
                'message' => 'Email đã tồn tại trong hệ thống',
                'data' => $data,
            ];
        }

        // Find organization by code
        $organizationId = null;
        if (!empty($data['organization_code'])) {
            $org = Organization::where('code', $data['organization_code'])->first();
            if (!$org) {
                return [
                    'row' => $rowNumber,
                    'status' => 'error',
                    'message' => 'Không tìm thấy đơn vị với mã: ' . $data['organization_code'],
                    'data' => $data,
                ];
            }
            $organizationId = $org->id;
        }

        // Create user with default password
        $defaultPassword = '123456';
        $user = User::create([
            'id' => Str::uuid()->toString(),
            'email' => $data['email'],
            'password' => bcrypt($defaultPassword),
            'first_name' => $data['first_name'],
            'last_name' => $data['last_name'],
            'phone' => $data['phone'] ?? null,
            'employee_id' => $data['employee_id'] ?? null,
            'role' => strtoupper($data['role']),
            'organization_id' => $organizationId,
            'is_vnuhcm' => !empty($data['is_vnuhcm']) && $data['is_vnuhcm'] !== '0',
            'status' => $data['status'] ?? 'active',
            'created_by' => auth()->id(),
        ]);

        return [
            'row' => $rowNumber,
            'status' => 'created',
            'message' => 'Tạo người dùng thành công (mật khẩu mặc định: ' . $defaultPassword . ')',
            'data' => ['email' => $user->email, 'name' => $user->first_name . ' ' . $user->last_name],
        ];
    }

    /**
     * Import single organization
     */
    private function importOrganization(array $data, int $rowNumber): array
    {
        // Validate required fields
        $errors = [];
        if (empty($data['code'])) $errors[] = 'Mã đơn vị là bắt buộc';
        if (empty($data['name'])) $errors[] = 'Tên đơn vị là bắt buộc';
        if (empty($data['type'])) $errors[] = 'Loại đơn vị là bắt buộc';

        if (!empty($errors)) {
            return [
                'row' => $rowNumber,
                'status' => 'error',
                'message' => implode(', ', $errors),
                'data' => $data,
            ];
        }

        // Validate type
        $validTypes = ['UNIVERSITY_SYSTEM', 'UNIVERSITY', 'RESEARCH_INSTITUTE', 'CENTER', 'DEPARTMENT', 'EXTERNAL'];
        if (!in_array(strtoupper($data['type']), $validTypes)) {
            return [
                'row' => $rowNumber,
                'status' => 'error',
                'message' => 'Loại đơn vị không hợp lệ. Phải là: ' . implode(', ', $validTypes),
                'data' => $data,
            ];
        }

        // Check duplicate code
        if (Organization::where('code', $data['code'])->exists()) {
            return [
                'row' => $rowNumber,
                'status' => 'duplicate',
                'message' => 'Mã đơn vị đã tồn tại trong hệ thống',
                'data' => $data,
            ];
        }

        // Find parent by code
        $parentId = null;
        if (!empty($data['parent_code'])) {
            $parent = Organization::where('code', $data['parent_code'])->first();
            if (!$parent) {
                return [
                    'row' => $rowNumber,
                    'status' => 'error',
                    'message' => 'Không tìm thấy đơn vị cha với mã: ' . $data['parent_code'],
                    'data' => $data,
                ];
            }
            $parentId = $parent->id;
        }

        // Create organization
        $org = Organization::create([
            'code' => $data['code'],
            'name' => $data['name'],
            'short_name' => $data['short_name'] ?? null,
            'type' => strtoupper($data['type']),
            'parent_id' => $parentId,
            'is_vnuhcm' => !empty($data['is_vnuhcm']) && $data['is_vnuhcm'] !== '0',
            'contact_email' => $data['contact_email'] ?? null,
            'contact_phone' => $data['contact_phone'] ?? null,
            'address' => $data['address'] ?? null,
            'website' => $data['website'] ?? null,
            'description' => $data['description'] ?? null,
            'display_order' => !empty($data['display_order']) ? (int)$data['display_order'] : 0,
            'status' => $data['status'] ?? 'active',
            'created_by' => auth()->id(),
        ]);

        return [
            'row' => $rowNumber,
            'status' => 'created',
            'message' => 'Tạo đơn vị thành công',
            'data' => ['code' => $org->code, 'name' => $org->name],
        ];
    }

    /**
     * Import single KPI
     */
    private function importKpi(array $data, int $rowNumber): array
    {
        // Validate required fields
        $errors = [];
        if (empty($data['source'])) $errors[] = 'Nguồn là bắt buộc';
        if (empty($data['code'])) $errors[] = 'Mã KPI là bắt buộc';
        if (empty($data['title'])) $errors[] = 'Tên chỉ tiêu là bắt buộc';

        if (!empty($errors)) {
            return [
                'row' => $rowNumber,
                'status' => 'error',
                'message' => implode(', ', $errors),
                'data' => $data,
            ];
        }

        // Validate source
        $validSources = ['CENTRAL', 'VNU'];
        if (!in_array(strtoupper($data['source']), $validSources)) {
            return [
                'row' => $rowNumber,
                'status' => 'error',
                'message' => 'Nguồn không hợp lệ. Phải là: CENTRAL hoặc VNU',
                'data' => $data,
            ];
        }

        // Check duplicate code
        if (Kpi::where('code', $data['code'])->exists()) {
            return [
                'row' => $rowNumber,
                'status' => 'duplicate',
                'message' => 'Mã KPI đã tồn tại trong hệ thống',
                'data' => $data,
            ];
        }

        // Create KPI
        $kpi = Kpi::create([
            'source' => strtoupper($data['source']),
            'code' => $data['code'],
            'title' => $data['title'],
            'description' => $data['description'] ?? null,
            'category' => $data['category'] ?? null,
            'order_number' => !empty($data['order_number']) ? (int)$data['order_number'] : 0,
            'is_active' => !isset($data['is_active']) || $data['is_active'] === '' || $data['is_active'] === '1',
            'created_by' => auth()->id(),
        ]);

        return [
            'row' => $rowNumber,
            'status' => 'created',
            'message' => 'Tạo KPI thành công',
            'data' => ['code' => $kpi->code, 'title' => $kpi->title],
        ];
    }

    /**
     * Import single activity type
     */
    private function importActivityType(array $data, int $rowNumber): array
    {
        // Validate required fields
        if (empty($data['name'])) {
            return [
                'row' => $rowNumber,
                'status' => 'error',
                'message' => 'Tên loại hoạt động là bắt buộc',
                'data' => $data,
            ];
        }

        // Check duplicate name
        if (ActivityType::where('name', $data['name'])->exists()) {
            return [
                'row' => $rowNumber,
                'status' => 'duplicate',
                'message' => 'Tên loại hoạt động đã tồn tại trong hệ thống',
                'data' => $data,
            ];
        }

        // Create activity type
        $type = ActivityType::create([
            'name' => $data['name'],
            'description' => $data['description'] ?? null,
            'display_order' => !empty($data['display_order']) ? (int)$data['display_order'] : 0,
            'is_active' => !isset($data['is_active']) || $data['is_active'] === '' || $data['is_active'] === '1',
        ]);

        return [
            'row' => $rowNumber,
            'status' => 'created',
            'message' => 'Tạo loại hoạt động thành công',
            'data' => ['name' => $type->name],
        ];
    }

    /**
     * Import single activity field
     */
    private function importActivityField(array $data, int $rowNumber): array
    {
        // Validate required fields
        if (empty($data['name'])) {
            return [
                'row' => $rowNumber,
                'status' => 'error',
                'message' => 'Tên lĩnh vực là bắt buộc',
                'data' => $data,
            ];
        }

        // Check duplicate name
        if (ActivityField::where('name', $data['name'])->exists()) {
            return [
                'row' => $rowNumber,
                'status' => 'duplicate',
                'message' => 'Tên lĩnh vực đã tồn tại trong hệ thống',
                'data' => $data,
            ];
        }

        // Create activity field
        $field = ActivityField::create([
            'name' => $data['name'],
            'description' => $data['description'] ?? null,
            'display_order' => !empty($data['display_order']) ? (int)$data['display_order'] : 0,
            'is_active' => !isset($data['is_active']) || $data['is_active'] === '' || $data['is_active'] === '1',
        ]);

        return [
            'row' => $rowNumber,
            'status' => 'created',
            'message' => 'Tạo lĩnh vực hoạt động thành công',
            'data' => ['name' => $field->name],
        ];
    }

    /**
     * Get template data by type
     */
    private function getTemplateData(string $type): ?array
    {
        $templates = [
            'users' => [
                'name' => 'Người dùng',
                'filename' => 'import_users_template.xlsx',
                'columns' => [
                    ['field' => 'email', 'label' => 'Email', 'required' => true, 'description' => 'Email người dùng (duy nhất)', 'example' => 'user@example.com'],
                    ['field' => 'first_name', 'label' => 'Họ', 'required' => true, 'description' => 'Họ và tên đệm', 'example' => 'Nguyễn Văn'],
                    ['field' => 'last_name', 'label' => 'Tên', 'required' => true, 'description' => 'Tên', 'example' => 'An'],
                    ['field' => 'phone', 'label' => 'Số điện thoại', 'required' => false, 'description' => 'Số điện thoại', 'example' => '0901234567'],
                    ['field' => 'employee_id', 'label' => 'Mã nhân viên', 'required' => false, 'description' => 'Mã nhân viên nội bộ', 'example' => 'NV001'],
                    ['field' => 'role', 'label' => 'Vai trò', 'required' => true, 'description' => 'Vai trò: GUEST, STAFF, MANAGER, OPERATOR, ADMIN', 'example' => 'STAFF'],
                    ['field' => 'organization_code', 'label' => 'Mã đơn vị', 'required' => false, 'description' => 'Mã đơn vị người dùng thuộc về', 'example' => 'KHTN'],
                    ['field' => 'is_vnuhcm', 'label' => 'Thuộc ĐHQG', 'required' => false, 'description' => '1 = Có, 0 = Không', 'example' => '1'],
                    ['field' => 'status', 'label' => 'Trạng thái', 'required' => false, 'description' => 'active, inactive, pending', 'example' => 'active'],
                ],
                'unique_fields' => ['email'],
            ],
            'organizations' => [
                'name' => 'Đơn vị',
                'filename' => 'import_organizations_template.xlsx',
                'columns' => [
                    ['field' => 'code', 'label' => 'Mã đơn vị', 'required' => true, 'description' => 'Mã đơn vị (duy nhất)', 'example' => 'KHTN'],
                    ['field' => 'name', 'label' => 'Tên đầy đủ', 'required' => true, 'description' => 'Tên đầy đủ của đơn vị', 'example' => 'Trường Đại học Khoa học Tự nhiên'],
                    ['field' => 'short_name', 'label' => 'Tên viết tắt', 'required' => false, 'description' => 'Tên viết tắt', 'example' => 'KHTN'],
                    ['field' => 'type', 'label' => 'Loại đơn vị', 'required' => true, 'description' => 'UNIVERSITY_SYSTEM, UNIVERSITY, RESEARCH_INSTITUTE, CENTER, DEPARTMENT, EXTERNAL', 'example' => 'UNIVERSITY'],
                    ['field' => 'parent_code', 'label' => 'Mã đơn vị cha', 'required' => false, 'description' => 'Mã đơn vị cấp trên', 'example' => 'VNU'],
                    ['field' => 'is_vnuhcm', 'label' => 'Thuộc ĐHQG', 'required' => false, 'description' => '1 = Có, 0 = Không', 'example' => '1'],
                    ['field' => 'contact_email', 'label' => 'Email liên hệ', 'required' => false, 'description' => 'Email liên hệ đơn vị', 'example' => 'contact@hcmus.edu.vn'],
                    ['field' => 'contact_phone', 'label' => 'Điện thoại', 'required' => false, 'description' => 'Số điện thoại liên hệ', 'example' => '028 38 353 193'],
                    ['field' => 'address', 'label' => 'Địa chỉ', 'required' => false, 'description' => 'Địa chỉ đơn vị', 'example' => '227 Nguyễn Văn Cừ, Q.5, TP.HCM'],
                    ['field' => 'website', 'label' => 'Website', 'required' => false, 'description' => 'Website đơn vị', 'example' => 'https://hcmus.edu.vn'],
                    ['field' => 'description', 'label' => 'Mô tả', 'required' => false, 'description' => 'Mô tả về đơn vị', 'example' => 'Trường thành viên ĐHQG-HCM'],
                    ['field' => 'display_order', 'label' => 'Thứ tự hiển thị', 'required' => false, 'description' => 'Số thứ tự sắp xếp', 'example' => '1'],
                    ['field' => 'status', 'label' => 'Trạng thái', 'required' => false, 'description' => 'active, inactive', 'example' => 'active'],
                ],
                'unique_fields' => ['code'],
            ],
            'kpis' => [
                'name' => 'Chỉ tiêu KPI',
                'filename' => 'import_kpis_template.xlsx',
                'columns' => [
                    ['field' => 'source', 'label' => 'Nguồn', 'required' => true, 'description' => 'CENTRAL (Trung ương) hoặc VNU (ĐHQG-HCM)', 'example' => 'VNU'],
                    ['field' => 'code', 'label' => 'Mã KPI', 'required' => true, 'description' => 'Mã chỉ tiêu (duy nhất)', 'example' => 'KPI-001'],
                    ['field' => 'title', 'label' => 'Tên chỉ tiêu', 'required' => true, 'description' => 'Tên đầy đủ của chỉ tiêu', 'example' => 'Số lượng bài báo quốc tế'],
                    ['field' => 'description', 'label' => 'Mô tả', 'required' => false, 'description' => 'Mô tả chi tiết về chỉ tiêu', 'example' => 'Số bài báo đăng trên tạp chí quốc tế uy tín'],
                    ['field' => 'category', 'label' => 'Danh mục', 'required' => false, 'description' => 'Phân loại chỉ tiêu', 'example' => 'Nghiên cứu khoa học'],
                    ['field' => 'order_number', 'label' => 'Số thứ tự', 'required' => false, 'description' => 'Thứ tự sắp xếp', 'example' => '1'],
                    ['field' => 'is_active', 'label' => 'Kích hoạt', 'required' => false, 'description' => '1 = Có, 0 = Không', 'example' => '1'],
                ],
                'unique_fields' => ['code'],
            ],
            'activity_types' => [
                'name' => 'Loại hoạt động',
                'filename' => 'import_activity_types_template.xlsx',
                'columns' => [
                    ['field' => 'name', 'label' => 'Tên loại hoạt động', 'required' => true, 'description' => 'Tên loại hoạt động (duy nhất)', 'example' => 'Hội thảo khoa học'],
                    ['field' => 'description', 'label' => 'Mô tả', 'required' => false, 'description' => 'Mô tả về loại hoạt động', 'example' => 'Các hội thảo, hội nghị khoa học'],
                    ['field' => 'display_order', 'label' => 'Thứ tự hiển thị', 'required' => false, 'description' => 'Số thứ tự sắp xếp', 'example' => '1'],
                    ['field' => 'is_active', 'label' => 'Kích hoạt', 'required' => false, 'description' => '1 = Có, 0 = Không', 'example' => '1'],
                ],
                'unique_fields' => ['name'],
            ],
            'activity_fields' => [
                'name' => 'Lĩnh vực hoạt động',
                'filename' => 'import_activity_fields_template.xlsx',
                'columns' => [
                    ['field' => 'name', 'label' => 'Tên lĩnh vực', 'required' => true, 'description' => 'Tên lĩnh vực (duy nhất)', 'example' => 'Nghiên cứu khoa học'],
                    ['field' => 'description', 'label' => 'Mô tả', 'required' => false, 'description' => 'Mô tả về lĩnh vực', 'example' => 'Các hoạt động nghiên cứu khoa học'],
                    ['field' => 'display_order', 'label' => 'Thứ tự hiển thị', 'required' => false, 'description' => 'Số thứ tự sắp xếp', 'example' => '1'],
                    ['field' => 'is_active', 'label' => 'Kích hoạt', 'required' => false, 'description' => '1 = Có, 0 = Không', 'example' => '1'],
                ],
                'unique_fields' => ['name'],
            ],
        ];

        return $templates[$type] ?? null;
    }
}
