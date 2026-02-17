// ===== API CONFIGURATION =====
// [¥¥¥¥¥¥¥¥Local Development API¥¥¥¥¥¥¥¥] - http://localhost:3000/api
// [¥¥¥¥¥¥¥¥Railway Production API¥¥¥¥¥¥¥¥] - Your deployed Railway URL
const API_BASE_URL = 'http://localhost:3000/api'; // Development
// const API_BASE_URL = '[¥¥¥¥¥¥¥¥Your Railway API URL¥¥¥¥¥¥¥¥]/api'; // Production

// ===== GLOBAL STATE =====
let currentStudents = [];
let deleteId = null;

// ===== DOM ELEMENTS =====
const form = document.getElementById('studentForm');
const tableBody = document.getElementById('tableBody');
const searchInput = document.getElementById('searchInput');
const filterStatus = document.getElementById('filterStatus');
const submitBtn = document.getElementById('submitBtn');
const formTitle = document.getElementById('form-title');
const cancelEditBtn = document.getElementById('cancelEditBtn');
const deleteModal = document.getElementById('deleteModal');
const deleteStudentName = document.getElementById('deleteStudentName');
const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', () => {
    loadStudents();
    setupEventListeners();
    setDefaultJoinDate();
});

function setDefaultJoinDate() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('joinDate').value = today;
}

function setupEventListeners() {
    form.addEventListener('submit', handleFormSubmit);
    searchInput.addEventListener('input', filterStudents);
    filterStatus.addEventListener('change', filterStudents);
    confirmDeleteBtn.addEventListener('click', handleDelete);
}

// ===== API FUNCTIONS =====
async function loadStudents() {
    try {
        showLoading();
        const response = await fetch(`${API_BASE_URL}/records`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            currentStudents = data.data || [];
            renderTable(currentStudents);
            showToast('Records loaded successfully', 'success');
        } else {
            throw new Error(data.message || 'Failed to load records');
        }
    } catch (error) {
        console.error('Error loading students:', error);
        showToast('Failed to load records. Please try again.', 'error');
        tableBody.innerHTML = `
            <tr>
                <td colspan="8" class="no-results">
                    <i class="fas fa-exclamation-circle" style="color: var(--danger);"></i>
                    Error loading records. Please refresh the page.
                </td>
            </tr>
        `;
    }
}

async function handleFormSubmit(event) {
    event.preventDefault();
    
    if (!validateForm()) {
        showToast('Please fix validation errors', 'error');
        return;
    }
    
    const formData = new FormData(form);
    const studentData = {
        name: formData.get('name').trim(),
        email: formData.get('email').trim(),
        phone: formData.get('phone')?.trim() || '',
        course: formData.get('course').trim(),
        feeStatus: formData.get('feeStatus'),
        joinDate: formData.get('joinDate'),
        notes: formData.get('notes')?.trim() || ''
    };
    
    const studentId = document.getElementById('studentId').value;
    const isEditing = !!studentId;
    
    try {
        const url = isEditing 
            ? `${API_BASE_URL}/records/${studentId}`
            : `${API_BASE_URL}/records`;
            
        const method = isEditing ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(studentData)
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            showToast(
                isEditing ? 'Student updated successfully' : 'Student added successfully',
                'success'
            );
            resetForm();
            await loadStudents();
        } else {
            throw new Error(result.message || 'Operation failed');
        }
    } catch (error) {
        console.error('Error saving student:', error);
        showToast(`Failed to save: ${error.message}`, 'error');
    }
}

async function fetchStudentById(id) {
    try {
        const response = await fetch(`${API_BASE_URL}/records/${id}`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            populateFormForEdit(data.data);
        } else {
            throw new Error(data.message || 'Failed to fetch student');
        }
    } catch (error) {
        console.error('Error fetching student:', error);
        showToast('Failed to load student details', 'error');
    }
}

// ===== CRUD OPERATIONS =====
function editStudent(id) {
    fetchStudentById(id);
}

function showDeleteModal(id, name) {
    deleteId = id;
    deleteStudentName.textContent = name;
    deleteModal.classList.add('show');
}

function closeDeleteModal() {
    deleteModal.classList.remove('show');
    deleteId = null;
    deleteStudentName.textContent = '';
}

async function handleDelete() {
    if (!deleteId) return;
    
    try {
        const response = await fetch(`${API_BASE_URL}/records/${deleteId}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            showToast('Student deleted successfully', 'success');
            closeDeleteModal();
            await loadStudents();
        } else {
            throw new Error(result.message || 'Delete failed');
        }
    } catch (error) {
        console.error('Error deleting student:', error);
        showToast('Failed to delete student', 'error');
        closeDeleteModal();
    }
}

function viewStudent(id) {
    const student = currentStudents.find(s => s._id === id);
    if (!student) return;
    
    const message = `
        Name: ${student.name}
        Email: ${student.email}
        Phone: ${student.phone || 'N/A'}
        Course: ${student.course}
        Fee Status: ${student.feeStatus}
        Join Date: ${new Date(student.joinDate).toLocaleDateString()}
        Notes: ${student.notes || 'No notes'}
    `;
    
    showToast(message, 'info', 5000);
}

// ===== FORM FUNCTIONS =====
function populateFormForEdit(student) {
    document.getElementById('studentId').value = student._id;
    document.getElementById('name').value = student.name;
    document.getElementById('email').value = student.email;
    document.getElementById('phone').value = student.phone || '';
    document.getElementById('course').value = student.course;
    document.getElementById('feeStatus').value = student.feeStatus;
    
    // Format date for input
    const joinDate = new Date(student.joinDate);
    const formattedDate = joinDate.toISOString().split('T')[0];
    document.getElementById('joinDate').value = formattedDate;
    
    document.getElementById('notes').value = student.notes || '';
    
    formTitle.textContent = 'Edit Student';
    submitBtn.innerHTML = '<i class="fas fa-save"></i> Update Student';
    cancelEditBtn.style.display = 'inline-flex';
    
    // Scroll to form
    document.querySelector('.form-section').scrollIntoView({ behavior: 'smooth' });
}

function resetForm() {
    form.reset();
    document.getElementById('studentId').value = '';
    formTitle.textContent = 'Add New Student';
    submitBtn.innerHTML = '<i class="fas fa-save"></i> Save Student';
    cancelEditBtn.style.display = 'none';
    setDefaultJoinDate();
    clearValidationErrors();
}

// ===== VALIDATION =====
function validateForm() {
    let isValid = true;
    clearValidationErrors();
    
    const name = document.getElementById('name').value.trim();
    const email = document.getElementById('email').value.trim();
    const course = document.getElementById('course').value.trim();
    const feeStatus = document.getElementById('feeStatus').value;
    const joinDate = document.getElementById('joinDate').value;
    
    if (!name) {
        showError('name', 'Name is required');
        isValid = false;
    } else if (name.length < 2) {
        showError('name', 'Name must be at least 2 characters');
        isValid = false;
    }
    
    if (!email) {
        showError('email', 'Email is required');
        isValid = false;
    } else if (!isValidEmail(email)) {
        showError('email', 'Please enter a valid email address');
        isValid = false;
    }
    
    const phone = document.getElementById('phone').value.trim();
    if (phone && !isValidPhone(phone)) {
        showError('phone', 'Please enter a valid phone number');
        isValid = false;
    }
    
    if (!course) {
        showError('course', 'Course/Service is required');
        isValid = false;
    }
    
    if (!feeStatus) {
        showError('feeStatus', 'Please select fee status');
        isValid = false;
    }
    
    if (!joinDate) {
        showError('joinDate', 'Join date is required');
        isValid = false;
    }
    
    return isValid;
}

function isValidEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

function isValidPhone(phone) {
    const re = /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/;
    return re.test(phone);
}

function showError(fieldId, message) {
    const input = document.getElementById(fieldId);
    const errorDiv = document.getElementById(`${fieldId}Error`);
    if (input && errorDiv) {
        input.classList.add('error');
        errorDiv.textContent = message;
    }
}

function clearValidationErrors() {
    document.querySelectorAll('.error').forEach(el => el.classList.remove('error'));
    document.querySelectorAll('.error-message').forEach(el => el.textContent = '');
}

// ===== RENDERING =====
function renderTable(students) {
    if (!students || students.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="8" class="no-results">
                    <i class="fas fa-user-slash" style="color: var(--gray);"></i>
                    No students found
                </td>
            </tr>
        `;
        return;
    }
    
    const rows = students.map(student => `
        <tr>
            <td><strong>${escapeHtml(student.name)}</strong></td>
            <td>${escapeHtml(student.email)}</td>
            <td>${escapeHtml(student.phone) || '-'}</td>
            <td>${escapeHtml(student.course)}</td>
            <td>
                <span class="status-badge status-${getStatusClass(student.feeStatus)}">
                    ${escapeHtml(student.feeStatus)}
                </span>
            </td>
            <td>${formatDate(student.joinDate)}</td>
            <td>${escapeHtml(student.notes) || '-'}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn-icon view" onclick="viewStudent('${student._id}')" title="View Details">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn-icon edit" onclick="editStudent('${student._id}')" title="Edit Student">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-icon delete" onclick="showDeleteModal('${student._id}', '${escapeHtml(student.name)}')" title="Delete Student">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
    
    tableBody.innerHTML = rows;
}

function getStatusClass(status) {
    switch (status?.toLowerCase()) {
        case 'paid': return 'paid';
        case 'pending': return 'pending';
        case 'partial': return 'partial';
        case 'scholarship': return 'scholarship';
        default: return 'pending';
    }
}

function formatDate(dateString) {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
}

function escapeHtml(text) {
    if (!text) return text;
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ===== SEARCH & FILTER =====
function filterStudents() {
    const searchTerm = searchInput.value.toLowerCase().trim();
    const statusFilter = filterStatus.value;
    
    const filtered = currentStudents.filter(student => {
        const matchesSearch = searchTerm === '' || 
            student.name.toLowerCase().includes(searchTerm) ||
            student.email.toLowerCase().includes(searchTerm) ||
            student.course.toLowerCase().includes(searchTerm);
        
        const matchesStatus = statusFilter === '' || 
            student.feeStatus === statusFilter;
        
        return matchesSearch && matchesStatus;
    });
    
    renderTable(filtered);
}

// ===== UI UTILITIES =====
function showLoading() {
    tableBody.innerHTML = `
        <tr>
            <td colspan="8" class="loading-message">
                <i class="fas fa-spinner fa-spin" aria-hidden="true"></i> Loading records...
            </td>
        </tr>
    `;
}

function showToast(message, type = 'info', duration = 3000) {
    const toastContainer = document.getElementById('toastContainer');
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icons = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        warning: 'fa-exclamation-triangle',
        info: 'fa-info-circle'
    };
    
    const titles = {
        success: 'Success',
        error: 'Error',
        warning: 'Warning',
        info: 'Information'
    };
    
    toast.innerHTML = `
        <div class="toast-icon">
            <i class="fas ${icons[type] || icons.info}" style="color: var(--${type});"></i>
        </div>
        <div class="toast-content">
            <div class="toast-title">${titles[type] || 'Info'}</div>
            <div class="toast-message">${message}</div>
        </div>
        <button class="toast-close" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    toastContainer.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'toastSlideIn reverse var(--transition-normal)';
        setTimeout(() => toast.remove(), 250);
    }, duration);
}

// ===== EXPOSE FUNCTIONS TO GLOBAL SCOPE =====
window.editStudent = editStudent;
window.viewStudent = viewStudent;
window.showDeleteModal = showDeleteModal;
window.closeDeleteModal = closeDeleteModal;
window.resetForm = resetForm;