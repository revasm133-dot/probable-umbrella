"""
Backend API Tests for File Manager Feature
Tests: File upload, list, download, delete, category filtering
"""
import pytest
import requests
import os
import io

# Get BASE_URL from frontend env
BASE_URL = "https://centella-nutrition.preview.emergentagent.com"

# Allowed extensions for testing
ALLOWED_EXTENSIONS = {
    ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx",
    ".csv", ".txt", ".md", ".jpg", ".jpeg", ".png", ".gif", ".webp",
    ".zip", ".rar"
}


class TestFileManagerBasics:
    """Test basic File Manager API endpoints"""
    
    def test_list_files_endpoint(self):
        """GET /api/files returns list of files"""
        response = requests.get(f"{BASE_URL}/api/files")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} files in the system")
        
    def test_list_files_with_category_filter(self):
        """GET /api/files?category=draft filters by category"""
        response = requests.get(f"{BASE_URL}/api/files?category=draft")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        # All returned files should have category 'draft'
        for file in data:
            assert file.get("category") == "draft", f"Expected category 'draft', got '{file.get('category')}'"
        print(f"Found {len(data)} files in 'draft' category")
        
    def test_list_files_with_semua_filter(self):
        """GET /api/files?category=semua returns all files (same as no filter)"""
        response_all = requests.get(f"{BASE_URL}/api/files")
        response_semua = requests.get(f"{BASE_URL}/api/files?category=semua")
        assert response_all.status_code == 200
        assert response_semua.status_code == 200
        # Both should return same count
        assert len(response_all.json()) == len(response_semua.json())
        print("Category 'semua' correctly returns all files")


class TestFileUpload:
    """Test file upload functionality"""
    
    def test_upload_txt_file(self):
        """POST /api/files/upload uploads a .txt file successfully"""
        # Create a test file in memory
        file_content = b"This is a test file content for testing upload."
        files = {"file": ("TEST_upload_test.txt", io.BytesIO(file_content), "text/plain")}
        data = {"category": "umum", "notes": "Test upload note"}
        
        response = requests.post(f"{BASE_URL}/api/files/upload", files=files, data=data)
        assert response.status_code == 200
        result = response.json()
        
        # Validate response structure
        assert "id" in result
        assert "filename" in result
        assert "original_name" in result
        assert "size" in result
        assert "content_type" in result
        assert "category" in result
        assert "notes" in result
        assert "uploaded_at" in result
        
        # Validate values
        assert result["original_name"] == "TEST_upload_test.txt"
        assert result["category"] == "umum"
        assert result["notes"] == "Test upload note"
        assert result["size"] == len(file_content)
        
        print(f"Successfully uploaded file: {result['id']}")
        return result["id"]
    
    def test_upload_csv_file(self):
        """POST /api/files/upload uploads a .csv file successfully"""
        csv_content = b"name,value\ntest1,100\ntest2,200"
        files = {"file": ("TEST_data.csv", io.BytesIO(csv_content), "text/csv")}
        data = {"category": "data", "notes": "Test CSV data"}
        
        response = requests.post(f"{BASE_URL}/api/files/upload", files=files, data=data)
        assert response.status_code == 200
        result = response.json()
        assert result["original_name"] == "TEST_data.csv"
        assert result["category"] == "data"
        print(f"Successfully uploaded CSV file: {result['id']}")
        return result["id"]
    
    def test_upload_with_default_category(self):
        """POST /api/files/upload uses default category 'umum' when not specified"""
        file_content = b"Default category test"
        files = {"file": ("TEST_default_cat.txt", io.BytesIO(file_content), "text/plain")}
        
        response = requests.post(f"{BASE_URL}/api/files/upload", files=files)
        assert response.status_code == 200
        result = response.json()
        assert result["category"] == "umum"
        print(f"Default category correctly set to 'umum'")
        return result["id"]
    
    def test_upload_rejects_invalid_extension(self):
        """POST /api/files/upload rejects files with invalid extensions"""
        file_content = b"#!/bin/bash\necho 'malicious'"
        files = {"file": ("TEST_malicious.exe", io.BytesIO(file_content), "application/octet-stream")}
        
        response = requests.post(f"{BASE_URL}/api/files/upload", files=files)
        assert response.status_code == 400
        result = response.json()
        assert "detail" in result
        assert "tidak didukung" in result["detail"].lower() or "ekstensi" in result["detail"].lower()
        print(f"Correctly rejected .exe file: {result['detail']}")
    
    def test_upload_rejects_php_extension(self):
        """POST /api/files/upload rejects .php files"""
        file_content = b"<?php echo 'test'; ?>"
        files = {"file": ("TEST_script.php", io.BytesIO(file_content), "application/x-php")}
        
        response = requests.post(f"{BASE_URL}/api/files/upload", files=files)
        assert response.status_code == 400
        print("Correctly rejected .php file")
    
    def test_upload_rejects_oversized_file(self):
        """POST /api/files/upload rejects files over 10MB"""
        # Create a file slightly over 10MB (10MB + 1KB)
        file_content = b"x" * (10 * 1024 * 1024 + 1024)
        files = {"file": ("TEST_large_file.txt", io.BytesIO(file_content), "text/plain")}
        
        response = requests.post(f"{BASE_URL}/api/files/upload", files=files)
        assert response.status_code == 400
        result = response.json()
        assert "detail" in result
        assert "10MB" in result["detail"] or "melebihi" in result["detail"].lower()
        print(f"Correctly rejected oversized file: {result['detail']}")


class TestFileDownload:
    """Test file download functionality"""
    
    def test_download_existing_file(self):
        """GET /api/files/{id}/download downloads an existing file"""
        # First upload a file
        file_content = b"Download test content - unique string 12345"
        files = {"file": ("TEST_download_test.txt", io.BytesIO(file_content), "text/plain")}
        upload_res = requests.post(f"{BASE_URL}/api/files/upload", files=files)
        assert upload_res.status_code == 200
        file_id = upload_res.json()["id"]
        
        # Download the file
        download_res = requests.get(f"{BASE_URL}/api/files/{file_id}/download")
        assert download_res.status_code == 200
        
        # Verify content matches
        assert download_res.content == file_content
        
        # Check Content-Disposition header
        content_disp = download_res.headers.get("Content-Disposition", "")
        assert "attachment" in content_disp
        assert "TEST_download_test.txt" in content_disp
        
        print(f"Successfully downloaded file: {file_id}")
        return file_id
    
    def test_download_nonexistent_file(self):
        """GET /api/files/{id}/download returns 404 for nonexistent file"""
        response = requests.get(f"{BASE_URL}/api/files/nonexistent-id-12345/download")
        assert response.status_code == 404
        print("Correctly returned 404 for nonexistent file download")


class TestFileDelete:
    """Test file deletion functionality"""
    
    def test_delete_existing_file(self):
        """DELETE /api/files/{id} deletes an existing file"""
        # First upload a file
        file_content = b"File to be deleted"
        files = {"file": ("TEST_to_delete.txt", io.BytesIO(file_content), "text/plain")}
        upload_res = requests.post(f"{BASE_URL}/api/files/upload", files=files)
        assert upload_res.status_code == 200
        file_id = upload_res.json()["id"]
        
        # Delete the file
        delete_res = requests.delete(f"{BASE_URL}/api/files/{file_id}")
        assert delete_res.status_code == 200
        result = delete_res.json()
        assert result["status"] == "deleted"
        
        # Verify file is gone
        download_res = requests.get(f"{BASE_URL}/api/files/{file_id}/download")
        assert download_res.status_code == 404
        
        print(f"Successfully deleted file: {file_id}")
    
    def test_delete_nonexistent_file(self):
        """DELETE /api/files/{id} returns 404 for nonexistent file"""
        response = requests.delete(f"{BASE_URL}/api/files/nonexistent-id-12345")
        assert response.status_code == 404
        print("Correctly returned 404 for nonexistent file deletion")


class TestFileCRUDFlow:
    """Test complete CRUD flow for files"""
    
    def test_full_crud_flow(self):
        """Test complete Create -> Read -> Download -> Delete flow"""
        # 1. CREATE - Upload a file
        file_content = b"CRUD test file content - testing full flow"
        files = {"file": ("TEST_crud_flow.txt", io.BytesIO(file_content), "text/plain")}
        data = {"category": "artikel", "notes": "CRUD flow test"}
        
        upload_res = requests.post(f"{BASE_URL}/api/files/upload", files=files, data=data)
        assert upload_res.status_code == 200
        file_data = upload_res.json()
        file_id = file_data["id"]
        print(f"1. Created file: {file_id}")
        
        # 2. READ - Verify file appears in list
        list_res = requests.get(f"{BASE_URL}/api/files")
        assert list_res.status_code == 200
        files_list = list_res.json()
        found_file = next((f for f in files_list if f["id"] == file_id), None)
        assert found_file is not None, "Uploaded file not found in list"
        assert found_file["original_name"] == "TEST_crud_flow.txt"
        assert found_file["category"] == "artikel"
        assert found_file["notes"] == "CRUD flow test"
        print(f"2. Verified file in list with correct metadata")
        
        # 3. READ with filter - Verify file appears in category filter
        filter_res = requests.get(f"{BASE_URL}/api/files?category=artikel")
        assert filter_res.status_code == 200
        filtered_files = filter_res.json()
        found_in_filter = next((f for f in filtered_files if f["id"] == file_id), None)
        assert found_in_filter is not None, "File not found in category filter"
        print(f"3. Verified file appears in category filter")
        
        # 4. DOWNLOAD - Download and verify content
        download_res = requests.get(f"{BASE_URL}/api/files/{file_id}/download")
        assert download_res.status_code == 200
        assert download_res.content == file_content
        print(f"4. Downloaded and verified file content")
        
        # 5. DELETE - Delete the file
        delete_res = requests.delete(f"{BASE_URL}/api/files/{file_id}")
        assert delete_res.status_code == 200
        print(f"5. Deleted file")
        
        # 6. VERIFY DELETION - File should not exist
        verify_res = requests.get(f"{BASE_URL}/api/files/{file_id}/download")
        assert verify_res.status_code == 404
        
        # Also verify not in list
        final_list = requests.get(f"{BASE_URL}/api/files").json()
        assert not any(f["id"] == file_id for f in final_list)
        print(f"6. Verified file is completely removed")
        
        print("Full CRUD flow completed successfully!")


class TestFileMetadataUpdate:
    """Test file metadata update functionality"""
    
    def test_update_file_category(self):
        """PUT /api/files/{id} updates file category"""
        # Upload a file
        file_content = b"Update test"
        files = {"file": ("TEST_update.txt", io.BytesIO(file_content), "text/plain")}
        data = {"category": "umum"}
        upload_res = requests.post(f"{BASE_URL}/api/files/upload", files=files, data=data)
        file_id = upload_res.json()["id"]
        
        # Update category
        update_res = requests.put(f"{BASE_URL}/api/files/{file_id}", data={"category": "artikel"})
        assert update_res.status_code == 200
        result = update_res.json()
        assert result["category"] == "artikel"
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/files/{file_id}")
        print("Successfully updated file category")
    
    def test_update_file_notes(self):
        """PUT /api/files/{id} updates file notes"""
        # Upload a file
        file_content = b"Notes update test"
        files = {"file": ("TEST_notes_update.txt", io.BytesIO(file_content), "text/plain")}
        upload_res = requests.post(f"{BASE_URL}/api/files/upload", files=files)
        file_id = upload_res.json()["id"]
        
        # Update notes
        update_res = requests.put(f"{BASE_URL}/api/files/{file_id}", data={"notes": "Updated notes"})
        assert update_res.status_code == 200
        result = update_res.json()
        assert result["notes"] == "Updated notes"
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/files/{file_id}")
        print("Successfully updated file notes")


# Cleanup fixture to remove TEST_ prefixed files after all tests
@pytest.fixture(scope="session", autouse=True)
def cleanup_test_files():
    """Cleanup TEST_ prefixed files after all tests complete"""
    yield
    
    try:
        files = requests.get(f"{BASE_URL}/api/files").json()
        for file in files:
            if file.get("original_name", "").startswith("TEST_"):
                requests.delete(f"{BASE_URL}/api/files/{file['id']}")
                print(f"Cleaned up file: {file['original_name']}")
    except Exception as e:
        print(f"Cleanup error (files): {e}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
