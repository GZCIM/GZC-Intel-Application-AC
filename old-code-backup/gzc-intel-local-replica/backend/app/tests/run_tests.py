import unittest
import sys
import logging
import asyncio
from datetime import datetime
from pathlib import Path
from unittest.runner import TextTestRunner
from unittest.loader import TestLoader
from test_framework import (
    TestFIXConnection,
    TestFIXMessageParser,
    TestMarketDataHandler,
    TestOrderManagement,
    # TestAdvancedTrading,
    TestIntegration
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(f'test_results_{datetime.now().strftime("%Y%m%d_%H%M%S")}.log'),
        logging.StreamHandler(sys.stdout)
    ]
)

class DetailedTestResult(unittest.TestResult):
    def __init__(self):
        super().__init__()
        self.test_results = []
        self.start_time = None
        self.current_test = None

    def startTest(self, test):
        self.start_time = datetime.now()
        self.current_test = test
        super().startTest(test)

    def addSuccess(self, test):
        elapsed = datetime.now() - self.start_time
        self.test_results.append({
            'test': test,
            'result': 'SUCCESS',
            'elapsed': elapsed,
            'details': None
        })
        super().addSuccess(test)

    def addError(self, test, err):
        elapsed = datetime.now() - self.start_time
        self.test_results.append({
            'test': test,
            'result': 'ERROR',
            'elapsed': elapsed,
            'details': err
        })
        super().addError(test, err)

    def addFailure(self, test, err):
        elapsed = datetime.now() - self.start_time
        self.test_results.append({
            'test': test,
            'result': 'FAILURE',
            'elapsed': elapsed,
            'details': err
        })
        super().addFailure(test, err)

    def addSkip(self, test, reason):
        elapsed = datetime.now() - self.start_time
        self.test_results.append({
            'test': test,
            'result': 'SKIPPED',
            'elapsed': elapsed,
            'details': reason
        })
        super().addSkip(test, reason)

class DetailedTestRunner(TextTestRunner):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

    def run(self, test):
        result = DetailedTestResult()
        start_time = datetime.now()
        test(result)
        elapsed = datetime.now() - start_time

        # Print detailed results
        print("\n=== Test Results ===")
        print(f"Run Date: {start_time.strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"Total Duration: {elapsed}")
        print(f"Tests Run: {result.testsRun}")
        print(f"Failures: {len(result.failures)}")
        print(f"Errors: {len(result.errors)}")
        print(f"Skipped: {len(result.skipped)}")
        print("\nDetailed Results:")

        for test_result in result.test_results:
            test_name = str(test_result['test'])
            status = test_result['result']
            duration = test_result['elapsed']
            details = test_result['details']

            print(f"\n{test_name}")
            print(f"Status: {status}")
            print(f"Duration: {duration}")
            if details:
                print(f"Details: {details}")

        return result

async def run_async_tests():
    """Run tests that require async functionality"""
    # Create test suite for async tests
    suite = unittest.TestSuite()
    suite.addTest(TestIntegration('test_full_trading_flow'))

    # Run async tests
    runner = DetailedTestRunner(verbosity=2)
    await runner.run(suite)

def run_all_tests():
    """Run all test cases with detailed reporting"""
    # Create test suite
    suite = unittest.TestSuite()

    # Add test cases
    test_cases = [
        TestFIXConnection,
        TestFIXMessageParser,
        TestMarketDataHandler,
        TestOrderManagement,
        TestAdvancedTrading
    ]

    for test_case in test_cases:
        tests = unittest.TestLoader().loadTestsFromTestCase(test_case)
        suite.addTests(tests)

    # Run tests with detailed runner
    runner = DetailedTestRunner(verbosity=2)
    result = runner.run(suite)

    # Run async tests
    asyncio.run(run_async_tests())

    return result

def generate_test_report(result):
    """Generate a detailed test report"""
    report_path = Path(f'test_report_{datetime.now().strftime("%Y%m%d_%H%M%S")}.html')

    with open(report_path, 'w') as f:
        f.write("""
        <html>
        <head>
            <title>Test Results</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                .success { color: green; }
                .failure { color: red; }
                .error { color: darkred; }
                .skipped { color: orange; }
                .test-case { margin: 10px 0; padding: 10px; border: 1px solid #ccc; }
            </style>
        </head>
        <body>
        """)

        f.write("<h1>Test Results</h1>")
        f.write(f"<p>Run Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</p>")
        f.write(f"<p>Tests Run: {result.testsRun}</p>")
        f.write(f"<p>Failures: {len(result.failures)}</p>")
        f.write(f"<p>Errors: {len(result.errors)}</p>")
        f.write(f"<p>Skipped: {len(result.skipped)}</p>")

        f.write("<h2>Detailed Results</h2>")
        for test_result in result.test_results:
            test_name = str(test_result['test'])
            status = test_result['result']
            duration = test_result['elapsed']
            details = test_result['details']

            status_class = status.lower()
            f.write(f"""
            <div class='test-case'>
                <h3>{test_name}</h3>
                <p class='{status_class}'>Status: {status}</p>
                <p>Duration: {duration}</p>
            """)

            if details:
                f.write(f"<p>Details: {details}</p>")

            f.write("</div>")

        f.write("</body></html>")

    logging.info(f"Test report generated: {report_path}")

if __name__ == '__main__':
    # Run all tests
    result = run_all_tests()

    # Generate test report
    generate_test_report(result)

    # Exit with appropriate status code
    sys.exit(len(result.failures) + len(result.errors))
