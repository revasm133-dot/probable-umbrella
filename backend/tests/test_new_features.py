"""
Backend API Tests for New Features - Iteration 2
Tests: Progress Tracker, CSV Export, CSV Import
"""
import pytest
import requests
import os
import io

# Get BASE_URL from frontend env
BASE_URL = "https://centella-nutrition.preview.emergentagent.com"


class TestProgressTracker:
    """Test Progress Tracker API endpoints"""
    
    def test_get_progress_list(self):
        """GET /api/progress returns list of thesis chapters"""
        response = requests.get(f"{BASE_URL}/api/progress")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} chapters in progress tracker")
        
        # Should have 5 seeded chapters
        if len(data) >= 5:
            print("Progress tracker has seeded chapters")
            # Validate chapter structure
            chapter = data[0]
            assert "id" in chapter
            assert "chapter_id" in chapter
            assert "title" in chapter
            assert "target_pages" in chapter
            assert "current_pages" in chapter
            assert "status" in chapter
            assert "subtasks" in chapter
            print(f"First chapter: {chapter['title']}")
        return data
    
    def test_seed_progress_if_empty(self):
        """POST /api/progress/seed seeds default chapters if none exist"""
        response = requests.post(f"{BASE_URL}/api/progress/seed")
        assert response.status_code == 200
        data = response.json()
        assert "status" in data
        # Either "seeded" or "already_seeded"
        print(f"Seed status: {data}")
    
    def test_update_chapter_status(self):
        """PUT /api/progress/{id} updates chapter status"""
        # First get the chapters
        list_res = requests.get(f"{BASE_URL}/api/progress")
        chapters = list_res.json()
        
        if len(chapters) == 0:
            # Seed first
            requests.post(f"{BASE_URL}/api/progress/seed")
            list_res = requests.get(f"{BASE_URL}/api/progress")
            chapters = list_res.json()
        
        assert len(chapters) > 0, "No chapters available for testing"
        
        chapter = chapters[0]
        chapter_id = chapter["id"]
        original_status = chapter["status"]
        
        # Update status to "sedang_dikerjakan"
        new_status = "sedang_dikerjakan" if original_status != "sedang_dikerjakan" else "revisi"
        update_res = requests.put(
            f"{BASE_URL}/api/progress/{chapter_id}",
            json={"status": new_status}
        )
        assert update_res.status_code == 200
        updated = update_res.json()
        assert updated["status"] == new_status
        print(f"Updated chapter {chapter['title']} status to: {new_status}")
        
        # Verify persistence with GET
        verify_res = requests.get(f"{BASE_URL}/api/progress")
        verify_chapters = verify_res.json()
        updated_chapter = next((c for c in verify_chapters if c["id"] == chapter_id), None)
        assert updated_chapter is not None
        assert updated_chapter["status"] == new_status
        print("Status update persisted correctly")
        
        # Restore original status
        requests.put(f"{BASE_URL}/api/progress/{chapter_id}", json={"status": original_status})
    
    def test_update_chapter_pages(self):
        """PUT /api/progress/{id} updates current_pages"""
        # Get chapters
        list_res = requests.get(f"{BASE_URL}/api/progress")
        chapters = list_res.json()
        
        if len(chapters) == 0:
            requests.post(f"{BASE_URL}/api/progress/seed")
            list_res = requests.get(f"{BASE_URL}/api/progress")
            chapters = list_res.json()
        
        chapter = chapters[0]
        chapter_id = chapter["id"]
        original_pages = chapter.get("current_pages", 0)
        
        # Update pages
        new_pages = 5
        update_res = requests.put(
            f"{BASE_URL}/api/progress/{chapter_id}",
            json={"current_pages": new_pages}
        )
        assert update_res.status_code == 200
        updated = update_res.json()
        assert updated["current_pages"] == new_pages
        print(f"Updated chapter pages to: {new_pages}")
        
        # Verify persistence
        verify_res = requests.get(f"{BASE_URL}/api/progress")
        verify_chapters = verify_res.json()
        updated_chapter = next((c for c in verify_chapters if c["id"] == chapter_id), None)
        assert updated_chapter["current_pages"] == new_pages
        print("Pages update persisted correctly")
        
        # Restore original
        requests.put(f"{BASE_URL}/api/progress/{chapter_id}", json={"current_pages": original_pages})
    
    def test_update_chapter_subtasks(self):
        """PUT /api/progress/{id} updates subtasks"""
        # Get chapters
        list_res = requests.get(f"{BASE_URL}/api/progress")
        chapters = list_res.json()
        
        if len(chapters) == 0:
            requests.post(f"{BASE_URL}/api/progress/seed")
            list_res = requests.get(f"{BASE_URL}/api/progress")
            chapters = list_res.json()
        
        chapter = chapters[0]
        chapter_id = chapter["id"]
        original_subtasks = chapter.get("subtasks", [])
        
        if len(original_subtasks) == 0:
            print("No subtasks to test, skipping")
            return
        
        # Toggle first subtask completion
        updated_subtasks = [s.copy() for s in original_subtasks]
        updated_subtasks[0]["completed"] = not updated_subtasks[0].get("completed", False)
        
        update_res = requests.put(
            f"{BASE_URL}/api/progress/{chapter_id}",
            json={"subtasks": updated_subtasks}
        )
        assert update_res.status_code == 200
        updated = update_res.json()
        assert updated["subtasks"][0]["completed"] == updated_subtasks[0]["completed"]
        print(f"Toggled subtask '{updated_subtasks[0]['title']}' to completed={updated_subtasks[0]['completed']}")
        
        # Verify persistence
        verify_res = requests.get(f"{BASE_URL}/api/progress")
        verify_chapters = verify_res.json()
        updated_chapter = next((c for c in verify_chapters if c["id"] == chapter_id), None)
        assert updated_chapter["subtasks"][0]["completed"] == updated_subtasks[0]["completed"]
        print("Subtask update persisted correctly")
        
        # Restore original
        requests.put(f"{BASE_URL}/api/progress/{chapter_id}", json={"subtasks": original_subtasks})
    
    def test_update_nonexistent_chapter(self):
        """PUT /api/progress/{id} with invalid id returns 404"""
        response = requests.put(
            f"{BASE_URL}/api/progress/nonexistent-id-12345",
            json={"status": "selesai"}
        )
        assert response.status_code == 404
        print("Correctly returned 404 for nonexistent chapter")


class TestStatisticsExportCSV:
    """Test CSV export for statistics results"""
    
    def test_export_csv_basic(self):
        """POST /api/statistics/export-csv returns CSV file"""
        payload = {
            "data": {
                "F1": [10.2, 10.5, 10.1],
                "F2": [12.3, 12.1, 12.5],
                "F3": [14.1, 14.3, 14.0]
            },
            "parameter_name": "Kadar Air",
            "alpha": 0.05
        }
        
        response = requests.post(f"{BASE_URL}/api/statistics/export-csv", json=payload)
        assert response.status_code == 200
        
        # Check content type
        content_type = response.headers.get("content-type", "")
        assert "text/csv" in content_type or "application/octet-stream" in content_type
        
        # Check content disposition header
        content_disp = response.headers.get("content-disposition", "")
        assert "attachment" in content_disp
        assert "statistik_Kadar_Air.csv" in content_disp
        
        # Validate CSV content
        csv_content = response.text
        assert "Hasil Analisis Statistik" in csv_content
        assert "Kadar Air" in csv_content
        assert "DATA MENTAH" in csv_content
        assert "STATISTIK DESKRIPTIF" in csv_content
        assert "HASIL ANOVA" in csv_content
        assert "F1" in csv_content
        assert "F2" in csv_content
        assert "F3" in csv_content
        
        print(f"CSV export successful, content length: {len(csv_content)} chars")
        print(f"CSV preview:\n{csv_content[:500]}...")
    
    def test_export_csv_with_dmrt(self):
        """POST /api/statistics/export-csv includes DMRT when significant"""
        # Data that should be significant
        payload = {
            "data": {
                "F1": [10.0, 10.1, 10.2],
                "F2": [15.0, 15.1, 15.2],
                "F3": [20.0, 20.1, 20.2]
            },
            "parameter_name": "Test DMRT",
            "alpha": 0.05
        }
        
        response = requests.post(f"{BASE_URL}/api/statistics/export-csv", json=payload)
        assert response.status_code == 200
        
        csv_content = response.text
        # Should include DMRT results
        assert "HASIL UJI DMRT" in csv_content
        assert "Notasi DMRT" in csv_content
        assert "MSE" in csv_content
        print("CSV export with DMRT results successful")
    
    def test_export_csv_invalid_data(self):
        """POST /api/statistics/export-csv with invalid data returns error"""
        payload = {
            "data": {},  # Empty data
            "parameter_name": "Test",
            "alpha": 0.05
        }
        
        response = requests.post(f"{BASE_URL}/api/statistics/export-csv", json=payload)
        # Should return 400 or 422 for invalid data
        assert response.status_code in [400, 422]
        print("Correctly rejected invalid data for CSV export")


class TestResearchDataImportCSV:
    """Test CSV import for research data"""
    
    def test_import_csv_valid(self):
        """POST /api/research-data/import-csv imports data from CSV"""
        # Create a valid CSV content
        csv_content = """Kadar Protein
%
Ulangan,F1,F2,F3
1,8.5,9.2,10.1
2,8.7,9.4,10.3
3,8.6,9.3,10.2
"""
        
        # Create file-like object
        files = {
            "file": ("test_import.csv", csv_content, "text/csv")
        }
        
        response = requests.post(f"{BASE_URL}/api/research-data/import-csv", files=files)
        assert response.status_code == 200
        data = response.json()
        
        assert data["status"] == "success"
        assert data["parameter"] == "Kadar Protein"
        assert data["unit"] == "%"
        assert "groups_imported" in data
        assert "F1" in data["groups_imported"]
        assert "F2" in data["groups_imported"]
        assert "F3" in data["groups_imported"]
        assert data["groups_imported"]["F1"] == 3
        assert "id" in data
        
        print(f"CSV import successful: {data}")
        
        # Verify data was persisted
        list_res = requests.get(f"{BASE_URL}/api/research-data")
        items = list_res.json()
        imported_item = next((i for i in items if i["id"] == data["id"]), None)
        assert imported_item is not None
        assert imported_item["parameter"] == "Kadar Protein"
        assert len(imported_item["data"]["F1"]) == 3
        print("Imported data persisted correctly")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/research-data/{data['id']}")
        return data["id"]
    
    def test_import_csv_different_format(self):
        """POST /api/research-data/import-csv handles different column names"""
        csv_content = """Aktivitas Air
Aw
Ulangan,F1,F2,F3
1,0.45,0.48,0.52
2,0.46,0.49,0.53
"""
        
        files = {
            "file": ("test_aw.csv", csv_content, "text/csv")
        }
        
        response = requests.post(f"{BASE_URL}/api/research-data/import-csv", files=files)
        assert response.status_code == 200
        data = response.json()
        
        assert data["parameter"] == "Aktivitas Air"
        assert data["unit"] == "Aw"
        print(f"Different format import successful: {data}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/research-data/{data['id']}")
    
    def test_import_csv_insufficient_rows(self):
        """POST /api/research-data/import-csv rejects CSV with < 4 rows"""
        csv_content = """Parameter
Unit
Header
"""
        
        files = {
            "file": ("bad.csv", csv_content, "text/csv")
        }
        
        response = requests.post(f"{BASE_URL}/api/research-data/import-csv", files=files)
        assert response.status_code == 400
        print("Correctly rejected CSV with insufficient rows")
    
    def test_import_csv_no_numeric_data(self):
        """POST /api/research-data/import-csv rejects CSV with no numeric data"""
        csv_content = """Parameter
Unit
Ulangan,F1,F2,F3
1,abc,def,ghi
2,jkl,mno,pqr
"""
        
        files = {
            "file": ("no_numbers.csv", csv_content, "text/csv")
        }
        
        response = requests.post(f"{BASE_URL}/api/research-data/import-csv", files=files)
        assert response.status_code == 400
        data = response.json()
        assert "detail" in data
        print(f"Correctly rejected CSV with no numeric data: {data['detail']}")


# Cleanup fixture
@pytest.fixture(scope="session", autouse=True)
def cleanup_test_data():
    """Cleanup TEST_ prefixed data after all tests complete"""
    yield
    
    # Cleanup research data with TEST_ prefix
    try:
        data = requests.get(f"{BASE_URL}/api/research-data").json()
        for item in data:
            if item.get("parameter", "").startswith("TEST_") or item.get("parameter") == "Kadar Protein":
                requests.delete(f"{BASE_URL}/api/research-data/{item['id']}")
                print(f"Cleaned up research data: {item['id']}")
    except Exception as e:
        print(f"Cleanup error: {e}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
