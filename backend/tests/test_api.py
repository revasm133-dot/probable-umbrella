"""
Backend API Tests for AI Research Assistant Platform
Tests: Chat sessions, Statistics, Writing, References, Research Data
"""
import pytest
import requests
import os
import time

# Get BASE_URL from frontend env
BASE_URL = "https://centella-nutrition.preview.emergentagent.com"

class TestHealthAndRoot:
    """Test basic API health"""
    
    def test_root_endpoint(self):
        """Test root API endpoint returns success"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        print(f"Root endpoint response: {data}")


class TestChatSessions:
    """Test chat session CRUD operations"""
    
    def test_create_chat_session(self):
        """POST /api/chat/sessions creates a new session"""
        response = requests.post(f"{BASE_URL}/api/chat/sessions")
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert "title" in data
        assert "created_at" in data
        print(f"Created session: {data['id']}")
        return data["id"]
    
    def test_get_chat_sessions(self):
        """GET /api/chat/sessions returns sessions list"""
        response = requests.get(f"{BASE_URL}/api/chat/sessions")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} sessions")
    
    def test_get_chat_messages(self):
        """GET /api/chat/messages/{session_id} returns message history"""
        # First create a session
        create_res = requests.post(f"{BASE_URL}/api/chat/sessions")
        session_id = create_res.json()["id"]
        
        # Get messages for that session
        response = requests.get(f"{BASE_URL}/api/chat/messages/{session_id}")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Messages for session {session_id}: {len(data)}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/chat/sessions/{session_id}")
    
    def test_delete_chat_session(self):
        """DELETE /api/chat/sessions/{session_id} deletes session"""
        # Create a session first
        create_res = requests.post(f"{BASE_URL}/api/chat/sessions")
        session_id = create_res.json()["id"]
        
        # Delete it
        response = requests.delete(f"{BASE_URL}/api/chat/sessions/{session_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "deleted"
        print(f"Deleted session: {session_id}")


class TestChatAI:
    """Test AI chat functionality - uses real Claude Opus integration"""
    
    def test_send_chat_message(self):
        """POST /api/chat/send sends message and gets AI response"""
        # Create a session first
        create_res = requests.post(f"{BASE_URL}/api/chat/sessions")
        session_id = create_res.json()["id"]
        
        # Send a simple message
        response = requests.post(
            f"{BASE_URL}/api/chat/send",
            json={"session_id": session_id, "message": "Halo"},
            timeout=60  # AI responses can take time
        )
        assert response.status_code == 200
        data = response.json()
        assert "content" in data
        assert "role" in data
        assert data["role"] == "assistant"
        assert len(data["content"]) > 0
        print(f"AI Response received: {data['content'][:100]}...")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/chat/sessions/{session_id}")


class TestStatisticsCalculator:
    """Test ANOVA and DMRT statistical calculations"""
    
    def test_calculate_statistics_significant(self):
        """POST /api/statistics/calculate performs ANOVA with significant result"""
        # Sample data that should show significant difference
        payload = {
            "data": {
                "F1": [10.2, 10.5, 10.1],
                "F2": [12.3, 12.1, 12.5],
                "F3": [14.1, 14.3, 14.0]
            },
            "parameter_name": "Kadar Air",
            "alpha": 0.05
        }
        
        response = requests.post(f"{BASE_URL}/api/statistics/calculate", json=payload)
        assert response.status_code == 200
        data = response.json()
        
        # Validate ANOVA results
        assert "anova" in data
        assert "f_statistic" in data["anova"]
        assert "p_value" in data["anova"]
        assert "significant" in data["anova"]
        
        # Validate descriptive stats
        assert "descriptive" in data
        assert "F1" in data["descriptive"]
        assert "mean" in data["descriptive"]["F1"]
        
        # With this data, should be significant
        assert data["anova"]["significant"] == True
        
        # DMRT should be present when significant
        assert "dmrt" in data
        assert data["dmrt"] is not None
        assert "ranked_means" in data["dmrt"]
        
        print(f"ANOVA F-stat: {data['anova']['f_statistic']}, p-value: {data['anova']['p_value']}")
        print(f"DMRT groups: {data['dmrt']['groupings']}")
    
    def test_calculate_statistics_not_significant(self):
        """POST /api/statistics/calculate with similar values (not significant)"""
        # Sample data with similar values
        payload = {
            "data": {
                "F1": [10.0, 10.1, 10.0],
                "F2": [10.1, 10.0, 10.1],
                "F3": [10.0, 10.1, 10.0]
            },
            "parameter_name": "Test Parameter",
            "alpha": 0.05
        }
        
        response = requests.post(f"{BASE_URL}/api/statistics/calculate", json=payload)
        assert response.status_code == 200
        data = response.json()
        
        # Should not be significant
        assert data["anova"]["significant"] == False
        # DMRT should be None when not significant
        assert data["dmrt"] is None
        print(f"Not significant - p-value: {data['anova']['p_value']}")
    
    def test_calculate_statistics_with_minimal_data(self):
        """POST /api/statistics/calculate with minimal data still works"""
        # Note: scipy f_oneway accepts single values per group
        payload = {
            "data": {
                "F1": [10.0],
                "F2": [12.0],
                "F3": [14.0]
            },
            "parameter_name": "Test",
            "alpha": 0.05
        }
        
        response = requests.post(f"{BASE_URL}/api/statistics/calculate", json=payload)
        # API accepts this - scipy handles it
        assert response.status_code == 200
        data = response.json()
        assert "anova" in data
        print(f"Minimal data calculation: {data['anova']}")


class TestWritingAssistant:
    """Test writing assistance endpoint"""
    
    def test_writing_assist_formal(self):
        """POST /api/writing/assist with formal mode"""
        payload = {
            "text": "Bubur instan ini enak banget dan bagus buat bencana.",
            "mode": "formal",
            "context": "Skripsi tentang bubur instan pegagan"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/writing/assist",
            json=payload,
            timeout=60
        )
        assert response.status_code == 200
        data = response.json()
        assert "result" in data
        assert "mode" in data
        assert data["mode"] == "formal"
        assert len(data["result"]) > 0
        print(f"Writing assist result: {data['result'][:100]}...")
    
    def test_writing_assist_paraphrase(self):
        """POST /api/writing/assist with paraphrase mode"""
        payload = {
            "text": "Penelitian ini bertujuan untuk menganalisis kandungan gizi bubur instan.",
            "mode": "paraphrase"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/writing/assist",
            json=payload,
            timeout=60
        )
        assert response.status_code == 200
        data = response.json()
        assert data["mode"] == "paraphrase"
        print(f"Paraphrase result: {data['result'][:100]}...")


class TestTemplates:
    """Test writing templates endpoint"""
    
    def test_get_templates(self):
        """GET /api/templates returns writing templates"""
        response = requests.get(f"{BASE_URL}/api/templates")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
        
        # Validate template structure
        template = data[0]
        assert "id" in template
        assert "title" in template
        assert "description" in template
        assert "structure" in template
        
        print(f"Found {len(data)} templates: {[t['title'] for t in data]}")


class TestReferenceManager:
    """Test reference CRUD operations"""
    
    def test_create_reference(self):
        """POST /api/references creates a reference"""
        payload = {
            "title": "TEST_Effect of Centella asiatica on Food Quality",
            "authors": "Test Author, Another Author",
            "year": 2024,
            "journal": "Journal of Food Science",
            "doi": "10.1234/test",
            "abstract": "This is a test abstract",
            "keywords": "centella, food, test",
            "notes": "Test note"
        }
        
        response = requests.post(f"{BASE_URL}/api/references", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert data["title"] == payload["title"]
        assert data["authors"] == payload["authors"]
        assert data["year"] == payload["year"]
        print(f"Created reference: {data['id']}")
        return data["id"]
    
    def test_get_references(self):
        """GET /api/references returns references list"""
        response = requests.get(f"{BASE_URL}/api/references")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} references")
    
    def test_create_and_delete_reference(self):
        """Create and delete reference - full CRUD flow"""
        # Create
        payload = {
            "title": "TEST_To Be Deleted Reference",
            "authors": "Delete Test",
            "year": 2024,
            "journal": "Test Journal"
        }
        create_res = requests.post(f"{BASE_URL}/api/references", json=payload)
        assert create_res.status_code == 200
        ref_id = create_res.json()["id"]
        
        # Verify it exists in list
        list_res = requests.get(f"{BASE_URL}/api/references")
        refs = list_res.json()
        assert any(r["id"] == ref_id for r in refs)
        
        # Delete
        delete_res = requests.delete(f"{BASE_URL}/api/references/{ref_id}")
        assert delete_res.status_code == 200
        assert delete_res.json()["status"] == "deleted"
        
        # Verify it's gone
        list_res2 = requests.get(f"{BASE_URL}/api/references")
        refs2 = list_res2.json()
        assert not any(r["id"] == ref_id for r in refs2)
        print(f"Successfully created and deleted reference: {ref_id}")
    
    def test_delete_nonexistent_reference(self):
        """DELETE /api/references/{id} with invalid id returns 404"""
        response = requests.delete(f"{BASE_URL}/api/references/nonexistent-id-12345")
        assert response.status_code == 404
        print("Correctly returned 404 for nonexistent reference")


class TestResearchData:
    """Test research data CRUD operations"""
    
    def test_create_research_data(self):
        """POST /api/research-data creates research data entry"""
        payload = {
            "parameter": "TEST_Kadar Air",
            "unit": "%",
            "data": {
                "F1": [10.2, 10.5, 10.1],
                "F2": [12.3, 12.1, 12.5],
                "F3": [14.1, 14.3, 14.0]
            }
        }
        
        response = requests.post(f"{BASE_URL}/api/research-data", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert data["parameter"] == payload["parameter"]
        assert data["unit"] == payload["unit"]
        assert "F1" in data["data"]
        print(f"Created research data: {data['id']}")
        return data["id"]
    
    def test_get_research_data(self):
        """GET /api/research-data returns research data list"""
        response = requests.get(f"{BASE_URL}/api/research-data")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} research data entries")
    
    def test_create_and_delete_research_data(self):
        """Create and delete research data - full CRUD flow"""
        # Create
        payload = {
            "parameter": "TEST_Delete Parameter",
            "unit": "g/100g",
            "data": {
                "F1": [5.0, 5.1, 5.2],
                "F2": [6.0, 6.1, 6.2],
                "F3": [7.0, 7.1, 7.2]
            }
        }
        create_res = requests.post(f"{BASE_URL}/api/research-data", json=payload)
        assert create_res.status_code == 200
        data_id = create_res.json()["id"]
        
        # Verify it exists
        list_res = requests.get(f"{BASE_URL}/api/research-data")
        items = list_res.json()
        assert any(d["id"] == data_id for d in items)
        
        # Delete
        delete_res = requests.delete(f"{BASE_URL}/api/research-data/{data_id}")
        assert delete_res.status_code == 200
        
        # Verify it's gone
        list_res2 = requests.get(f"{BASE_URL}/api/research-data")
        items2 = list_res2.json()
        assert not any(d["id"] == data_id for d in items2)
        print(f"Successfully created and deleted research data: {data_id}")


# Cleanup fixture to remove TEST_ prefixed data after all tests
@pytest.fixture(scope="session", autouse=True)
def cleanup_test_data():
    """Cleanup TEST_ prefixed data after all tests complete"""
    yield
    
    # Cleanup references
    try:
        refs = requests.get(f"{BASE_URL}/api/references").json()
        for ref in refs:
            if ref.get("title", "").startswith("TEST_"):
                requests.delete(f"{BASE_URL}/api/references/{ref['id']}")
                print(f"Cleaned up reference: {ref['id']}")
    except Exception as e:
        print(f"Cleanup error (references): {e}")
    
    # Cleanup research data
    try:
        data = requests.get(f"{BASE_URL}/api/research-data").json()
        for item in data:
            if item.get("parameter", "").startswith("TEST_"):
                requests.delete(f"{BASE_URL}/api/research-data/{item['id']}")
                print(f"Cleaned up research data: {item['id']}")
    except Exception as e:
        print(f"Cleanup error (research data): {e}")
    
    # Cleanup chat sessions (those created during tests)
    try:
        sessions = requests.get(f"{BASE_URL}/api/chat/sessions").json()
        for session in sessions:
            if session.get("title", "").startswith("Halo") or session.get("title") == "Sesi Baru":
                requests.delete(f"{BASE_URL}/api/chat/sessions/{session['id']}")
                print(f"Cleaned up session: {session['id']}")
    except Exception as e:
        print(f"Cleanup error (sessions): {e}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
