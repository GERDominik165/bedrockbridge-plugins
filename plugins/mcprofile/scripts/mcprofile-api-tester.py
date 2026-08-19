#!/usr/bin/env python3
"""
MCProfile API Tester Script
@version 2.0.0

Comprehensive testing script for MCProfile API integration
Tests all endpoints and validates responses
"""

import requests
import json
import time
from typing import Dict, List, Optional, Tuple
from datetime import datetime
import sys

class MCProfileAPITester:
    """Test MCProfile API endpoints"""

    def __init__(self, base_url: str = "https://api.mcprofile.io"):
        self.base_url = base_url
        self.session = requests.Session()
        self.test_results = []
        self.stats = {
            "total_tests": 0,
            "passed": 0,
            "failed": 0,
            "total_time": 0
        }

    def test_xuid_endpoint(self, xuid: str) -> Tuple[bool, Dict]:
        """Test /api/v1/bedrock/xuid/{xuid} endpoint"""
        print(f"\n[TEST] XUID Endpoint: {xuid}")

        try:
            start_time = time.time()
            url = f"{self.base_url}/api/v1/bedrock/xuid/{xuid}"

            response = self.session.get(url, timeout=10)
            elapsed = time.time() - start_time

            self.stats["total_tests"] += 1

            if response.status_code == 200:
                data = response.json()
                self.validate_bedrock_profile(data)

                print(f"✓ PASSED (Response time: {elapsed:.2f}s)")
                print(f"  Gamertag: {data.get('gamertag', 'N/A')}")
                print(f"  Linked: {data.get('linked', False)}")

                self.stats["passed"] += 1
                self.test_results.append({
                    "test": "XUID",
                    "status": "PASSED",
                    "time": elapsed,
                    "data": data
                })
                return True, data
            else:
                print(f"✗ FAILED: HTTP {response.status_code}")
                self.stats["failed"] += 1
                return False, {}

        except Exception as e:
            print(f"✗ ERROR: {str(e)}")
            self.stats["failed"] += 1
            return False, {}

    def test_fuid_endpoint(self, fuid: str) -> Tuple[bool, Dict]:
        """Test /api/v1/bedrock/fuid/{fuid} endpoint"""
        print(f"\n[TEST] Floodgate UID Endpoint: {fuid}")

        try:
            start_time = time.time()
            url = f"{self.base_url}/api/v1/bedrock/fuid/{fuid}"

            response = self.session.get(url, timeout=10)
            elapsed = time.time() - start_time

            self.stats["total_tests"] += 1

            if response.status_code == 200:
                data = response.json()
                self.validate_bedrock_profile(data)

                print(f"✓ PASSED (Response time: {elapsed:.2f}s)")
                print(f"  Gamertag: {data.get('gamertag', 'N/A')}")

                self.stats["passed"] += 1
                return True, data
            else:
                print(f"✗ FAILED: HTTP {response.status_code}")
                self.stats["failed"] += 1
                return False, {}

        except Exception as e:
            print(f"✗ ERROR: {str(e)}")
            self.stats["failed"] += 1
            return False, {}

    def test_java_uuid_endpoint(self, uuid: str) -> Tuple[bool, Dict]:
        """Test /api/v1/java/uuid/{uuid} endpoint"""
        print(f"\n[TEST] Java UUID Endpoint: {uuid}")

        try:
            start_time = time.time()
            # Normalize UUID
            normalized_uuid = uuid.replace("-", "")
            url = f"{self.base_url}/api/v1/java/uuid/{normalized_uuid}"

            response = self.session.get(url, timeout=10)
            elapsed = time.time() - start_time

            self.stats["total_tests"] += 1

            if response.status_code == 200:
                data = response.json()
                self.validate_java_profile(data)

                print(f"✓ PASSED (Response time: {elapsed:.2f}s)")
                print(f"  Username: {data.get('username', 'N/A')}")
                print(f"  Linked: {data.get('linked', False)}")

                self.stats["passed"] += 1
                return True, data
            else:
                print(f"✗ FAILED: HTTP {response.status_code}")
                self.stats["failed"] += 1
                return False, {}

        except Exception as e:
            print(f"✗ ERROR: {str(e)}")
            self.stats["failed"] += 1
            return False, {}

    def validate_bedrock_profile(self, data: Dict) -> bool:
        """Validate Bedrock profile response structure"""
        required_fields = ['gamertag', 'xuid', 'floodgateuid']

        for field in required_fields:
            if field not in data:
                raise ValueError(f"Missing required field: {field}")

        if data.get('linked') and not data.get('java_uuid'):
            raise ValueError("Linked profile missing java_uuid")

        return True

    def validate_java_profile(self, data: Dict) -> bool:
        """Validate Java profile response structure"""
        required_fields = ['username', 'uuid']

        for field in required_fields:
            if field not in data:
                raise ValueError(f"Missing required field: {field}")

        if data.get('linked') and not data.get('bedrock_xuid'):
            raise ValueError("Linked profile missing bedrock_xuid")

        return True

    def test_api_health(self) -> bool:
        """Test API health endpoint"""
        print(f"\n[TEST] API Health Check")

        try:
            url = f"{self.base_url}/health"
            response = self.session.get(url, timeout=5)

            self.stats["total_tests"] += 1

            if response.status_code == 200:
                print("✓ API is healthy")
                self.stats["passed"] += 1
                return True
            else:
                print(f"✗ API health check failed: {response.status_code}")
                self.stats["failed"] += 1
                return False

        except Exception as e:
            print(f"✗ ERROR: {str(e)}")
            self.stats["failed"] += 1
            return False

    def test_error_handling(self) -> None:
        """Test error handling for invalid inputs"""
        print(f"\n[TEST] Error Handling")

        # Test with invalid XUID
        print("  Testing invalid XUID...")
        try:
            url = f"{self.base_url}/api/v1/bedrock/xuid/invalid"
            response = self.session.get(url, timeout=5)

            if response.status_code in [400, 404]:
                print("    ✓ Proper error response for invalid XUID")
                self.stats["passed"] += 1
            else:
                print(f"    ✗ Unexpected status code: {response.status_code}")
                self.stats["failed"] += 1

        except Exception as e:
            print(f"    ✗ ERROR: {str(e)}")
            self.stats["failed"] += 1

    def test_rate_limiting(self, requests_count: int = 10) -> None:
        """Test rate limiting"""
        print(f"\n[TEST] Rate Limiting ({requests_count} requests)")

        test_xuid = "25332248730d7792"
        rate_limited = False

        for i in range(requests_count):
            try:
                url = f"{self.base_url}/api/v1/bedrock/xuid/{test_xuid}"
                response = self.session.get(url, timeout=5)

                if response.status_code == 429:
                    print(f"  Rate limited after {i} requests")
                    rate_limited = True
                    break

            except Exception as e:
                print(f"  Request {i} failed: {str(e)}")
                break

        if not rate_limited:
            print(f"  ✓ No rate limiting detected in {requests_count} requests")

    def generate_report(self) -> Dict:
        """Generate test report"""
        return {
            "timestamp": datetime.now().isoformat(),
            "api_endpoint": self.base_url,
            "statistics": {
                "total_tests": self.stats["total_tests"],
                "passed": self.stats["passed"],
                "failed": self.stats["failed"],
                "success_rate": f"{(self.stats['passed'] / self.stats['total_tests'] * 100):.1f}%" if self.stats["total_tests"] > 0 else "N/A"
            },
            "results": self.test_results
        }

    def print_summary(self) -> None:
        """Print test summary"""
        print("\n" + "=" * 60)
        print("TEST SUMMARY")
        print("=" * 60)
        print(f"Total Tests: {self.stats['total_tests']}")
        print(f"Passed: {self.stats['passed']}")
        print(f"Failed: {self.stats['failed']}")

        if self.stats["total_tests"] > 0:
            success_rate = (self.stats["passed"] / self.stats["total_tests"]) * 100
            print(f"Success Rate: {success_rate:.1f}%")

        print("=" * 60)

def main():
    """Main test function"""
    print("\n" + "=" * 60)
    print("MCProfile API Tester v2.0.0")
    print("=" * 60)

    tester = MCProfileAPITester()

    # Test API health
    tester.test_api_health()

    # Test real example data
    print("\n[TESTING REAL ENDPOINTS]")

    # Test XUID endpoint
    tester.test_xuid_endpoint("25332248730d7792")

    # Test Floodgate UID endpoint
    tester.test_fuid_endpoint("00000000-0000-0000-0009-000004ed8eb0")

    # Test Java UUID endpoint
    tester.test_java_uuid_endpoint("cb7a4c0c-a7cd-4846-8bdf-477de8f5f3ee")

    # Test error handling
    tester.test_error_handling()

    # Test rate limiting
    tester.test_rate_limiting(5)

    # Print summary
    tester.print_summary()

    # Generate report
    report = tester.generate_report()
    print("\n[REPORT]")
    print(json.dumps(report, indent=2))

    # Save report to file
    with open("mcprofile_test_report.json", "w") as f:
        json.dump(report, f, indent=2)

    print("\n✓ Report saved to mcprofile_test_report.json")

if __name__ == "__main__":
    main()
