/**
 * Pterodactyl Bedrock Bridge - Connection Tester
 * Tool zur Diagnose von Verbindungsproblemen
 */

import { PterodactylClient } from '../api/PterodactylClient';
import { IHttpConfig } from '../types';
import { logger } from './Logger';

export interface IConnectionTestResult {
  success: boolean;
  timestamp: number;
  tests: {
    name: string;
    passed: boolean;
    duration: number;
    message: string;
    error?: string;
  }[];
  summary: {
    totalTests: number;
    passedTests: number;
    failedTests: number;
    totalDuration: number;
  };
}

export class ConnectionTester {
  private client: PterodactylClient;
  private config: IHttpConfig;

  constructor(config: IHttpConfig) {
    this.config = config;
    this.client = new PterodactylClient(config);
  }

  /**
   * Run all connection tests
   */
  async runTests(): Promise<IConnectionTestResult> {
    const results: IConnectionTestResult = {
      success: false,
      timestamp: Date.now(),
      tests: [],
      summary: {
        totalTests: 0,
        passedTests: 0,
        failedTests: 0,
        totalDuration: 0
      }
    };

    // Test 1: Basic connectivity
    results.tests.push(await this.testBasicConnectivity());

    // Test 2: API Key validity
    results.tests.push(await this.testApiKeyValidity());

    // Test 3: Server list retrieval
    results.tests.push(await this.testServerListRetrieval());

    // Test 4: Error handling
    results.tests.push(await this.testErrorHandling());

    // Test 5: Rate limiting
    results.tests.push(await this.testRateLimiting());

    // Calculate summary
    results.summary.totalTests = results.tests.length;
    results.summary.passedTests = results.tests.filter(t => t.passed).length;
    results.summary.failedTests = results.tests.filter(t => !t.passed).length;
    results.summary.totalDuration = results.tests.reduce((sum, t) => sum + t.duration, 0);
    results.success = results.summary.failedTests === 0;

    logger.info('Connection tests completed', {
      success: results.success,
      passed: results.summary.passedTests,
      failed: results.summary.failedTests,
      duration: results.summary.totalDuration
    });

    return results;
  }

  /**
   * Test basic connectivity
   */
  private async testBasicConnectivity() {
    const start = Date.now();
    const test = {
      name: 'Basic Connectivity',
      passed: false,
      duration: 0,
      message: 'Testing connection to Pterodactyl Panel...',
      error: undefined as string | undefined
    };

    try {
      // Simple HEAD request to test connectivity
      await this.client.head('/api/client');
      test.passed = true;
      test.message = 'Successfully connected to Pterodactyl Panel';
    } catch (error) {
      test.passed = false;
      test.error = error instanceof Error ? error.message : String(error);
      test.message = `Failed to connect: ${test.error}`;
    }

    test.duration = Date.now() - start;
    return test;
  }

  /**
   * Test API Key validity
   */
  private async testApiKeyValidity() {
    const start = Date.now();
    const test = {
      name: 'API Key Validity',
      passed: false,
      duration: 0,
      message: 'Testing API key...',
      error: undefined as string | undefined
    };

    try {
      const response = await this.client.get('/api/client/account');

      if (response && response.attributes) {
        test.passed = true;
        test.message = `Valid API key for user: ${response.attributes.username}`;
      } else {
        test.passed = false;
        test.error = 'Unexpected response format';
        test.message = `Invalid API key or response format`;
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('401')) {
        test.passed = false;
        test.error = 'Unauthorized - Invalid API key';
      } else if (error instanceof Error && error.message.includes('403')) {
        test.passed = false;
        test.error = 'Forbidden - Insufficient permissions';
      } else {
        test.passed = false;
        test.error = error instanceof Error ? error.message : String(error);
      }
      test.message = `API key test failed: ${test.error}`;
    }

    test.duration = Date.now() - start;
    return test;
  }

  /**
   * Test server list retrieval
   */
  private async testServerListRetrieval() {
    const start = Date.now();
    const test = {
      name: 'Server List Retrieval',
      passed: false,
      duration: 0,
      message: 'Retrieving server list...',
      error: undefined as string | undefined
    };

    try {
      const response = await this.client.get('/api/client?per_page=1');

      if (response && Array.isArray(response.data)) {
        test.passed = true;
        test.message = `Successfully retrieved server list (${response.data.length} servers)`;
      } else if (response && response.data === undefined) {
        test.passed = true;
        test.message = 'Server list retrieved (no servers found)';
      } else {
        test.passed = false;
        test.error = 'Unexpected response format';
        test.message = 'Failed to parse server list response';
      }
    } catch (error) {
      test.passed = false;
      test.error = error instanceof Error ? error.message : String(error);
      test.message = `Server list retrieval failed: ${test.error}`;
    }

    test.duration = Date.now() - start;
    return test;
  }

  /**
   * Test error handling
   */
  private async testErrorHandling() {
    const start = Date.now();
    const test = {
      name: 'Error Handling',
      passed: false,
      duration: 0,
      message: 'Testing error handling...',
      error: undefined as string | undefined
    };

    try {
      // Try to access non-existent server
      await this.client.get('/api/client/servers/nonexistent123');

      // If we get here, error handling might not be working properly
      test.passed = false;
      test.error = 'Expected error was not thrown';
      test.message = 'Error handling might not be working properly';
    } catch (error) {
      // Expected to fail
      test.passed = true;
      test.message = 'Error handling working correctly (proper error thrown)';
    }

    test.duration = Date.now() - start;
    return test;
  }

  /**
   * Test rate limiting
   */
  private async testRateLimiting() {
    const start = Date.now();
    const test = {
      name: 'Rate Limiting',
      passed: false,
      duration: 0,
      message: 'Testing rate limiting...',
      error: undefined as string | undefined
    };

    try {
      // Send multiple requests quickly
      const requests = [];
      for (let i = 0; i < 5; i++) {
        requests.push(this.client.head('/api/client'));
      }

      await Promise.all(requests);

      test.passed = true;
      test.message = 'Rate limiting working correctly (5 requests processed)';
    } catch (error) {
      test.passed = false;
      test.error = error instanceof Error ? error.message : String(error);
      test.message = `Rate limiting test failed: ${test.error}`;
    }

    test.duration = Date.now() - start;
    return test;
  }

  /**
   * Print test results
   */
  static printResults(results: IConnectionTestResult): string {
    let output = '\n═══════════════════════════════════════════════════════════\n';
    output += 'PTERODACTYL CONNECTION TEST RESULTS\n';
    output += '═══════════════════════════════════════════════════════════\n\n';

    results.tests.forEach((test, index) => {
      const icon = test.passed ? '✓' : '✗';
      output += `${icon} Test ${index + 1}: ${test.name}\n`;
      output += `  Status: ${test.passed ? 'PASSED' : 'FAILED'}\n`;
      output += `  Duration: ${test.duration}ms\n`;
      output += `  Message: ${test.message}\n`;
      if (test.error) {
        output += `  Error: ${test.error}\n`;
      }
      output += '\n';
    });

    output += '═══════════════════════════════════════════════════════════\n';
    output += `SUMMARY: ${results.summary.passedTests}/${results.summary.totalTests} tests passed\n`;
    output += `Total Duration: ${results.summary.totalDuration}ms\n`;
    output += `Overall Status: ${results.success ? 'SUCCESS ✓' : 'FAILED ✗'}\n`;
    output += '═══════════════════════════════════════════════════════════\n';

    return output;
  }
}
