"""
Tests for the Mergington High School API
"""
import pytest
from fastapi.testclient import TestClient
from src.app import app, activities


@pytest.fixture
def client():
    """Create a test client"""
    return TestClient(app)


@pytest.fixture(autouse=True)
def reset_activities():
    """Reset activities data before each test"""
    # Store original state
    original_activities = {
        name: {
            "description": details["description"],
            "schedule": details["schedule"],
            "max_participants": details["max_participants"],
            "participants": details["participants"].copy()
        }
        for name, details in activities.items()
    }
    
    yield
    
    # Restore original state after test
    for name, details in original_activities.items():
        activities[name]["participants"] = details["participants"].copy()


def test_root_redirects(client):
    """Test that root redirects to static index.html"""
    response = client.get("/", follow_redirects=False)
    assert response.status_code == 307
    assert response.headers["location"] == "/static/index.html"


def test_get_activities(client):
    """Test getting all activities"""
    response = client.get("/activities")
    assert response.status_code == 200
    data = response.json()
    
    # Check that we have activities
    assert len(data) > 0
    
    # Check structure of first activity
    first_activity = list(data.values())[0]
    assert "description" in first_activity
    assert "schedule" in first_activity
    assert "max_participants" in first_activity
    assert "participants" in first_activity


def test_signup_for_activity_success(client):
    """Test successfully signing up for an activity"""
    response = client.post(
        "/activities/Chess Club/signup?email=test@mergington.edu"
    )
    assert response.status_code == 200
    data = response.json()
    assert "message" in data
    assert "test@mergington.edu" in data["message"]
    
    # Verify student was added
    activities_response = client.get("/activities")
    activities_data = activities_response.json()
    assert "test@mergington.edu" in activities_data["Chess Club"]["participants"]


def test_signup_for_nonexistent_activity(client):
    """Test signing up for an activity that doesn't exist"""
    response = client.post(
        "/activities/Nonexistent Activity/signup?email=test@mergington.edu"
    )
    assert response.status_code == 404
    data = response.json()
    assert "detail" in data
    assert "Activity not found" in data["detail"]


def test_signup_duplicate_registration(client):
    """Test that duplicate registration is prevented"""
    email = "duplicate@mergington.edu"
    activity = "Chess Club"
    
    # First signup should succeed
    response1 = client.post(
        f"/activities/{activity}/signup?email={email}"
    )
    assert response1.status_code == 200
    
    # Second signup should fail
    response2 = client.post(
        f"/activities/{activity}/signup?email={email}"
    )
    assert response2.status_code == 400
    data = response2.json()
    assert "already signed up" in data["detail"]


def test_unregister_from_activity_success(client):
    """Test successfully unregistering from an activity"""
    email = "unregister@mergington.edu"
    activity = "Chess Club"
    
    # First sign up
    client.post(f"/activities/{activity}/signup?email={email}")
    
    # Then unregister
    response = client.delete(
        f"/activities/{activity}/unregister?email={email}"
    )
    assert response.status_code == 200
    data = response.json()
    assert "Unregistered" in data["message"]
    
    # Verify student was removed
    activities_response = client.get("/activities")
    activities_data = activities_response.json()
    assert email not in activities_data[activity]["participants"]


def test_unregister_from_nonexistent_activity(client):
    """Test unregistering from an activity that doesn't exist"""
    response = client.delete(
        "/activities/Nonexistent Activity/unregister?email=test@mergington.edu"
    )
    assert response.status_code == 404
    data = response.json()
    assert "Activity not found" in data["detail"]


def test_unregister_not_registered(client):
    """Test unregistering when not registered"""
    email = "notregistered@mergington.edu"
    activity = "Chess Club"
    
    response = client.delete(
        f"/activities/{activity}/unregister?email={email}"
    )
    assert response.status_code == 400
    data = response.json()
    assert "not registered" in data["detail"]


def test_all_activities_have_required_fields(client):
    """Test that all activities have the required fields"""
    response = client.get("/activities")
    activities_data = response.json()
    
    required_fields = ["description", "schedule", "max_participants", "participants"]
    
    for activity_name, activity_data in activities_data.items():
        for field in required_fields:
            assert field in activity_data, f"{activity_name} missing {field}"
        
        # Check data types
        assert isinstance(activity_data["description"], str)
        assert isinstance(activity_data["schedule"], str)
        assert isinstance(activity_data["max_participants"], int)
        assert isinstance(activity_data["participants"], list)


def test_activity_count(client):
    """Test that we have the expected number of activities"""
    response = client.get("/activities")
    activities_data = response.json()
    
    # Should have at least 9 activities (3 original + 6 added)
    assert len(activities_data) >= 9
