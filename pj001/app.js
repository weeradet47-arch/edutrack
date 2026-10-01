const StorageKey = 'EduTrackData';

class App {
    constructor() {
        this.data = this.loadData();
        this.init();
    }

    init() {
        this.bindEvents();
        this.updateTeacherName();
        this.renderDashboardStats();
        this.updateClassSelects();
        
        // Set today as default date for attendance
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('attendance-date').value = today;
    }

    loadData() {
        const defaultData = {
            teacher: '',
            attendancePoints: { 'มา': 1, 'ลา': 0.5, 'ขาด': 0, 'โดด': 0 },
            classes: []
        };
        const raw = localStorage.getItem(StorageKey);
        if (raw) {
            const data = JSON.parse(raw);
            if (!data.attendancePoints) data.attendancePoints = defaultData.attendancePoints;
            return data;
        }
        return defaultData;
    }

    saveData() {
        localStorage.setItem(StorageKey, JSON.stringify(this.data));
        this.renderDashboardStats();
    }

    bindEvents() {
        // Navigation
        document.querySelectorAll('.menu-item').forEach(item => {
            item.addEventListener('click', (e) => {
                document.querySelectorAll('.menu-item').forEach(m => m.classList.remove('active'));
                item.classList.add('active');
                
                document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
                const pageId = item.getAttribute('data-page');
                document.getElementById(pageId).classList.add('active');

                this.onPageLoad(pageId);
            });
        });
    }

    onPageLoad(pageId) {
        if (pageId === 'manage-class') this.renderClasses();
        else if (pageId === 'manage-students') this.updateClassSelects();
        else if (pageId === 'settings') {
            document.getElementById('setting-teacher-name').value = this.data.teacher || '';
            document.getElementById('setting-pts-present').value = this.data.attendancePoints['มา'] !== undefined ? this.data.attendancePoints['มา'] : 1;
            document.getElementById('setting-pts-leave').value = this.data.attendancePoints['ลา'] !== undefined ? this.data.attendancePoints['ลา'] : 0.5;
            document.getElementById('setting-pts-absent').value = this.data.attendancePoints['ขาด'] !== undefined ? this.data.attendancePoints['ขาด'] : 0;
            document.getElementById('setting-pts-skip').value = this.data.attendancePoints['โดด'] !== undefined ? this.data.attendancePoints['โดด'] : 0;
        }
    }

    // --- Settings ---
    saveSettings() {
        const name = document.getElementById('setting-teacher-name').value;
        this.data.teacher = name;
        
        this.data.attendancePoints = {
            'มา': parseFloat(document.getElementById('setting-pts-present').value) || 0,
            'ลา': parseFloat(document.getElementById('setting-pts-leave').value) || 0,
            'ขาด': parseFloat(document.getElementById('setting-pts-absent').value) || 0,
            'โดด': parseFloat(document.getElementById('setting-pts-skip').value) || 0,
        };
        
        this.saveData();
        this.updateTeacherName();
        alert('บันทึกการตั้งค่าแล้ว');
    }

    updateTeacherName() {
        document.getElementById('teacher-name-display').textContent = this.data.teacher || 'ยังไม่ได้ตั้งชื่อ';
    }

    clearAllData() {
        if (confirm('คุณแน่ใจหรือไม่ที่จะลบข้อมูลทั้งหมด? การกระทำนี้ไม่สามารถย้อนกลับได้')) {
            localStorage.removeItem(StorageKey);
            this.data = { teacher: '', classes: [] };
            this.init();
            alert('ลบข้อมูลทั้งหมดเรียบร้อยแล้ว');
            window.location.reload();
        }
    }

    // --- Dashboard ---
    renderDashboardStats() {
        const numClasses = this.data.classes.length;
        const numStudents = this.data.classes.reduce((sum, c) => sum + (c.students ? c.students.length : 0), 0);
        
        document.getElementById('stat-classes').textContent = numClasses;
        document.getElementById('stat-students').textContent = numStudents;
    }

    // --- Modals ---
    showModal(id) { document.getElementById(id).classList.add('show'); }
    closeModal(id) { document.getElementById(id).classList.remove('show'); }

    // --- Manage Classes ---
    showAddClassModal() {
        document.getElementById('new-class-name').value = '';
        this.showModal('class-modal');
    }

    saveClass() {
        const name = document.getElementById('new-class-name').value.trim();
        if (!name) return alert('กรุณาระบุชื่อห้องเรียน');
        
        this.data.classes.push({
            id: 'class_' + Date.now(),
            name: name,
            students: [],
            attendance: {}, // { date: { studentId: status } }
            gradeColumns: [],
            grades: {} // { studentId: { colId: score } }
        });
        this.saveData();
        this.closeModal('class-modal');
        this.renderClasses();
        this.updateClassSelects();
    }

    renderClasses() {
        const container = document.getElementById('class-list-container');
        container.innerHTML = '';
        this.data.classes.forEach(c => {
            const card = document.createElement('div');
            card.className = 'class-card';
            card.innerHTML = `
                <h3>${c.name}</h3>
                <p>นักเรียน ${c.students ? c.students.length : 0} คน</p>
                <div class="class-actions">
                    <button class="btn btn-danger btn-sm" onclick="app.deleteClass('${c.id}')">ลบ</button>
                </div>
            `;
            container.appendChild(card);
        });
    }

    deleteClass(id) {
        if (confirm('ยืนยันการลบห้องเรียนนี้? ข้อมูลนักเรียน คะแนน และการเช็คชื่อจะหายไปทั้งหมด')) {
            this.data.classes = this.data.classes.filter(c => c.id !== id);
            this.saveData();
            this.renderClasses();
            this.updateClassSelects();
        }
    }

    updateClassSelects() {
        const selects = ['student-class-select', 'attendance-class-select', 'grade-class-select'];
        selects.forEach(selId => {
            const select = document.getElementById(selId);
            if (!select) return;
            const currentVal = select.value;
            select.innerHTML = '<option value="">-- เลือกห้องเรียน --</option>';
            this.data.classes.forEach(c => {
                select.innerHTML += `<option value="${c.id}">${c.name}</option>`;
            });
            select.value = currentVal;
        });
    }

    getClass(id) {
        return this.data.classes.find(c => c.id === id);
    }

    formatName(s) {
        if (!s.prefix) return s.name;
        // Check if prefix already ends with space or if it's "นาย", "นาง", "นางสาว" where usually there's no space in Thai, or add space if needed. Actually in Thai, space after prefix is optional but common. Let's just concatenate directly for now.
        return `${s.prefix}${s.name}`;
    }

    // --- Manage Students ---
    showAddStudentModal(studentId = null) {
        const classId = document.getElementById('student-class-select').value;
        if (!classId) return alert('กรุณาเลือกห้องเรียนก่อน');

        if (studentId) {
            // Edit
            const cls = this.getClass(classId);
            const stu = cls.students.find(s => s.id === studentId);
            document.getElementById('student-modal-title').textContent = 'แก้ไขนักเรียน';
            document.getElementById('student-id-hidden').value = stu.id;
            document.getElementById('student-order').value = stu.order;
            document.getElementById('student-code').value = stu.code;
            document.getElementById('student-prefix').value = stu.prefix || 'ด.ช.';
            document.getElementById('student-fullname').value = stu.name;
        } else {
            // Add
            const cls = this.getClass(classId);
            const nextOrder = (cls.students.length || 0) + 1;
            document.getElementById('student-modal-title').textContent = 'เพิ่มนักเรียน';
            document.getElementById('student-id-hidden').value = '';
            document.getElementById('student-order').value = nextOrder;
            document.getElementById('student-code').value = '';
            document.getElementById('student-prefix').value = 'ด.ช.';
            document.getElementById('student-fullname').value = '';
        }
        this.showModal('student-modal');
    }

    saveStudent() {
        const classId = document.getElementById('student-class-select').value;
        const sId = document.getElementById('student-id-hidden').value;
        const order = parseInt(document.getElementById('student-order').value);
        const code = document.getElementById('student-code').value;
        const prefix = document.getElementById('student-prefix').value;
        const name = document.getElementById('student-fullname').value;

        if (!order || !name) return alert('กรุณากรอกข้อมูลให้ครบถ้วน (ลำดับและชื่อ)');

        const cls = this.getClass(classId);
        if (!cls.students) cls.students = [];

        if (sId) {
            const stu = cls.students.find(s => s.id === sId);
            stu.order = order;
            stu.code = code;
            stu.prefix = prefix;
            stu.name = name;
        } else {
            cls.students.push({
                id: 'stu_' + Date.now(),
                order,
                code,
                prefix,
                name
            });
        }
        
        // Sort by order
        cls.students.sort((a, b) => a.order - b.order);

        this.saveData();
        this.closeModal('student-modal');
        this.renderStudentList();
    }

    deleteStudent(studentId) {
        if (!confirm('ยืนยันการลบนักเรียนคนนี้?')) return;
        const classId = document.getElementById('student-class-select').value;
        const cls = this.getClass(classId);
        cls.students = cls.students.filter(s => s.id !== studentId);
        this.saveData();
        this.renderStudentList();
    }

    renderStudentList() {
        const classId = document.getElementById('student-class-select').value;
        const tbody = document.getElementById('student-table-body');
        tbody.innerHTML = '';
        
        if (!classId) return;

        const cls = this.getClass(classId);
        if (!cls.students || cls.students.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center">ยังไม่มีข้อมูลนักเรียน</td></tr>';
            return;
        }

        cls.students.forEach(s => {
            tbody.innerHTML += `
                <tr>
                    <td>${s.order}</td>
                    <td>${s.code || '-'}</td>
                    <td>${this.formatName(s)}</td>
                    <td class="text-right">
                        <button class="btn btn-sm btn-outline" onclick="app.showAddStudentModal('${s.id}')">แก้ไข</button>
                        <button class="btn btn-sm btn-danger ml-2" onclick="app.deleteStudent('${s.id}')">ลบ</button>
                    </td>
                </tr>
            `;
        });
    }

    // --- Attendance ---
    renderAttendanceList() {
        const classId = document.getElementById('attendance-class-select').value;
        const date = document.getElementById('attendance-date').value;
        const tbody = document.getElementById('attendance-table-body');
        const actionBar = document.getElementById('attendance-action-bar');
        const btnCheckAll = document.getElementById('btn-check-all');
        
        tbody.innerHTML = '';
        if (!classId || !date) {
            actionBar.style.display = 'none';
            if (btnCheckAll) btnCheckAll.style.display = 'none';
            return;
        }

        const cls = this.getClass(classId);
        if (!cls.students || cls.students.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center">ยังไม่มีข้อมูลนักเรียนในห้องนี้</td></tr>';
            actionBar.style.display = 'none';
            if (btnCheckAll) btnCheckAll.style.display = 'none';
            return;
        }

        if (!cls.attendance) cls.attendance = {};
        const todayAttendance = cls.attendance[date] || {};

        cls.students.forEach(s => {
            const status = todayAttendance[s.id] || 'มา'; // Default to มา
            const cumulativeScore = this.getStudentAttendanceScore(classId, s.id);
            
            tbody.innerHTML += `
                <tr>
                    <td>${s.order}</td>
                    <td>${this.formatName(s)}</td>
                    <td class="text-center"><input type="radio" name="att_${s.id}" value="มา" class="attendance-radio" ${status === 'มา' ? 'checked' : ''}></td>
                    <td class="text-center"><input type="radio" name="att_${s.id}" value="ลา" class="attendance-radio" ${status === 'ลา' ? 'checked' : ''}></td>
                    <td class="text-center"><input type="radio" name="att_${s.id}" value="ขาด" class="attendance-radio" ${status === 'ขาด' ? 'checked' : ''}></td>
                    <td class="text-center"><input type="radio" name="att_${s.id}" value="โดด" class="attendance-radio" ${status === 'โดด' ? 'checked' : ''}></td>
                    <td class="text-center font-weight-bold" style="color: var(--primary-color);">${cumulativeScore}</td>
                </tr>
            `;
        });
        actionBar.style.display = 'flex';
        if (btnCheckAll) btnCheckAll.style.display = 'inline-flex';
    }

    checkAllPresent() {
        const radios = document.querySelectorAll('.attendance-radio[value="มา"]');
        radios.forEach(radio => radio.checked = true);
    }

    saveAttendance() {
        if (!confirm('ยืนยันการบันทึกข้อมูลการเช็คชื่อใช่หรือไม่?')) return;
        
        const classId = document.getElementById('attendance-class-select').value;
        const date = document.getElementById('attendance-date').value;
        const cls = this.getClass(classId);
        
        if (!cls.attendance) cls.attendance = {};
        cls.attendance[date] = {};

        cls.students.forEach(s => {
            const val = document.querySelector(`input[name="att_${s.id}"]:checked`).value;
            cls.attendance[date][s.id] = val;
        });

        this.saveData();
        alert('บันทึกการเช็คชื่อเรียบร้อยแล้ว');
        this.renderAttendanceList();
    }

    exportAttendanceExcel() {
        const classId = document.getElementById('attendance-class-select').value;
        const date = document.getElementById('attendance-date').value;
        const cls = this.getClass(classId);
        
        const data = [];
        data.push(['วันที่', date, 'ห้องเรียน', cls.name]);
        data.push(['ลำดับ', 'รหัสนักเรียน', 'ชื่อ-นามสกุล', 'สถานะ']);
        
        const att = (cls.attendance && cls.attendance[date]) ? cls.attendance[date] : {};
        
        cls.students.forEach(s => {
            data.push([
                s.order, 
                s.code || '', 
                this.formatName(s), 
                att[s.id] || '-'
            ]);
        });

        const ws = XLSX.utils.aoa_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Attendance");
        XLSX.writeFile(wb, `เช็คชื่อ_${cls.name}_${date}.xlsx`);
    }

    getStudentAttendanceScore(classId, studentId) {
        const cls = this.getClass(classId);
        if (!cls.attendance) return 0;
        
        let score = 0;
        const pts = this.data.attendancePoints || { 'มา': 1, 'ลา': 0.5, 'ขาด': 0, 'โดด': 0 };
        
        Object.values(cls.attendance).forEach(day => {
            const status = day[studentId];
            if (status && pts[status] !== undefined) {
                score += pts[status];
            }
        });
        return score;
    }

    // --- Grades ---
    showAddGradeColumnModal(colId = null) {
        const classId = document.getElementById('grade-class-select').value;
        if (!classId) return alert('กรุณาเลือกห้องเรียนก่อน');
        
        const btnDelete = document.getElementById('btn-delete-grade-col');
        
        if (colId) {
            const cls = this.getClass(classId);
            const col = cls.gradeColumns.find(c => c.id === colId);
            document.getElementById('grade-modal-title').textContent = 'แก้ไขช่องเก็บคะแนน';
            document.getElementById('grade-col-id-hidden').value = col.id;
            document.getElementById('grade-col-name').value = col.name;
            document.getElementById('grade-col-max').value = col.maxScore;
            if (btnDelete) btnDelete.style.display = 'inline-flex';
        } else {
            document.getElementById('grade-modal-title').textContent = 'สร้างช่องเก็บคะแนน';
            document.getElementById('grade-col-id-hidden').value = '';
            document.getElementById('grade-col-name').value = '';
            document.getElementById('grade-col-max').value = '';
            if (btnDelete) btnDelete.style.display = 'none';
        }
        this.showModal('grade-column-modal');
    }

    deleteCurrentGradeColumn() {
        const colId = document.getElementById('grade-col-id-hidden').value;
        if (colId) {
            this.deleteGradeColumn(colId);
            const classId = document.getElementById('grade-class-select').value;
            const cls = this.getClass(classId);
            if (!cls.gradeColumns.find(c => c.id === colId)) {
                this.closeModal('grade-column-modal');
            }
        }
    }

    saveGradeColumn() {
        const classId = document.getElementById('grade-class-select').value;
        const colId = document.getElementById('grade-col-id-hidden').value;
        const name = document.getElementById('grade-col-name').value;
        const max = document.getElementById('grade-col-max').value;
        
        if (!name || !max) return alert('กรุณากรอกข้อมูลให้ครบถ้วน');

        const cls = this.getClass(classId);
        if (!cls.gradeColumns) cls.gradeColumns = [];
        
        if (colId) {
            const col = cls.gradeColumns.find(c => c.id === colId);
            col.name = name;
            col.maxScore = parseFloat(max);
        } else {
            cls.gradeColumns.push({
                id: 'gcol_' + Date.now(),
                name,
                maxScore: parseFloat(max)
            });
        }

        this.saveData();
        this.closeModal('grade-column-modal');
        this.renderGrades();
    }

    deleteGradeColumn(colId) {
        if (!confirm('ยืนยันการลบช่องคะแนนนี้?')) return;
        const classId = document.getElementById('grade-class-select').value;
        const cls = this.getClass(classId);
        
        cls.gradeColumns = cls.gradeColumns.filter(c => c.id !== colId);
        // Also clean up grades
        if (cls.grades) {
            Object.keys(cls.grades).forEach(stuId => {
                delete cls.grades[stuId][colId];
            });
        }
        
        this.saveData();
        this.renderGrades();
    }

    renderGrades() {
        const classId = document.getElementById('grade-class-select').value;
        const thead = document.getElementById('grades-table-head');
        const tbody = document.getElementById('grades-table-body');
        const actionBar = document.getElementById('grades-action-bar');
        
        thead.innerHTML = '';
        tbody.innerHTML = '';
        
        if (!classId) {
            actionBar.style.display = 'none';
            return;
        }

        const cls = this.getClass(classId);
        if (!cls.students || cls.students.length === 0) {
            tbody.innerHTML = '<tr><td class="text-center">ยังไม่มีข้อมูลนักเรียน</td></tr>';
            actionBar.style.display = 'none';
            return;
        }
        
        if (!cls.gradeColumns) cls.gradeColumns = [];
        if (!cls.grades) cls.grades = {};

        // Build Header
        let headHtml = '<tr><th>ลำดับ</th><th>ชื่อ-นามสกุล</th>';
        cls.gradeColumns.forEach(col => {
            headHtml += `
                <th class="text-center">
                    ${col.name} <br>
                    <small class="text-muted">(เต็ม ${col.maxScore})</small>
                    <br>
                    <div style="margin-top: 8px; display: flex; justify-content: center;">
                        <button class="btn btn-sm btn-outline" style="padding: 2px 8px; font-size: 11px;" onclick="app.showAddGradeColumnModal('${col.id}')">⚙️ จัดการ</button>
                    </div>
                </th>
            `;
        });
        headHtml += '<th class="text-center" style="background-color: #f1f5f9;">คะแนนเช็คชื่อ</th>';
        headHtml += '<th class="text-center">รวมทั้งหมด</th></tr>';
        thead.innerHTML = headHtml;

        // Build Body
        cls.students.forEach(s => {
            if (!cls.grades[s.id]) cls.grades[s.id] = {};
            
            let total = 0;
            let rowHtml = `<tr><td>${s.order}</td><td>${this.formatName(s)}</td>`;
            
            cls.gradeColumns.forEach(col => {
                const score = cls.grades[s.id][col.id] || '';
                if (score !== '') total += parseFloat(score);
                
                rowHtml += `
                    <td class="text-center">
                        <input type="number" class="grade-input" 
                               data-student="${s.id}" data-col="${col.id}" 
                               value="${score}" max="${col.maxScore}" min="0">
                    </td>
                `;
            });
            
            const attScore = this.getStudentAttendanceScore(classId, s.id);
            total += attScore;
            rowHtml += `<td class="text-center font-weight-bold" style="background-color: #f1f5f9; color: var(--primary-color);">${attScore}</td>`;
            
            rowHtml += `<td class="text-center font-weight-bold">${total}</td></tr>`;
            tbody.innerHTML += rowHtml;
        });

        actionBar.style.display = 'flex';
        
        // Auto-save & calculate on input
        document.querySelectorAll('.grade-input').forEach(input => {
            input.addEventListener('change', (e) => {
                let val = parseFloat(e.target.value);
                const max = parseFloat(e.target.getAttribute('max'));
                
                if (isNaN(val)) e.target.value = '';
                else if (val > max) e.target.value = max;
                else if (val < 0) e.target.value = 0;
            });
        });
    }

    saveGrades() {
        const classId = document.getElementById('grade-class-select').value;
        const cls = this.getClass(classId);
        
        document.querySelectorAll('.grade-input').forEach(input => {
            const sId = input.getAttribute('data-student');
            const cId = input.getAttribute('data-col');
            const val = input.value;
            
            if (val !== '') {
                cls.grades[sId][cId] = parseFloat(val);
            } else {
                delete cls.grades[sId][cId];
            }
        });
        
        this.saveData();
        this.renderGrades(); // Re-render to update totals
        alert('บันทึกคะแนนเรียบร้อยแล้ว');
    }

    exportGradesExcel() {
        const classId = document.getElementById('grade-class-select').value;
        const cls = this.getClass(classId);
        
        const data = [];
        data.push(['ระบบบันทึกคะแนน', 'ห้องเรียน:', cls.name]);
        
        // Header
        const header = ['ลำดับ', 'รหัสนักเรียน', 'ชื่อ-นามสกุล'];
        cls.gradeColumns.forEach(c => header.push(`${c.name} (${c.maxScore})`));
        header.push('คะแนนเช็คชื่อ');
        header.push('คะแนนรวมทั้งหมด');
        data.push(header);
        
        // Rows
        cls.students.forEach(s => {
            const row = [s.order, s.code || '', this.formatName(s)];
            let total = 0;
            cls.gradeColumns.forEach(c => {
                const score = cls.grades[s.id] && cls.grades[s.id][c.id] !== undefined ? cls.grades[s.id][c.id] : '';
                row.push(score);
                if (score !== '') total += parseFloat(score);
            });
            const attScore = this.getStudentAttendanceScore(classId, s.id);
            row.push(attScore);
            total += attScore;
            row.push(total);
            data.push(row);
        });

        const ws = XLSX.utils.aoa_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Grades");
        XLSX.writeFile(wb, `คะแนน_${cls.name}.xlsx`);
    }
}

// Initialize App
const app = new App();
