
import asyncio
import aiohttp
import time
import random

# CONFIGURATION
BASE_URL = "http://localhost:4000"  # Adjust if server is on another port
EXAM_ID = "cmje5m8sw0001loggh5c3xtj6" # Use a valid Exam ID from your DB
NUM_STUDENTS = 20  # Number of concurrent students
REQUESTS_PER_STUDENT = 10 # Number of actions each student performs

async def simulate_student(session, student_id):
    print(f"Student {student_id}: Starting exam session")
    try:
        # Simulate accessing the exam page (fetch exam details)
        start_time = time.time()
        async with session.get(f"{BASE_URL}/api/student/exams/{EXAM_ID}") as response:
            latency = time.time() - start_time
            status = response.status
            if status == 200:
                print(f"Student {student_id}: Fetched exam (Status: {status}, Latency: {latency:.2f}s)")
            else:
                print(f"Student {student_id}: FAILED to fetch exam (Status: {status})")

        # Simulate random delay (thinking/reading time)
        await asyncio.sleep(random.uniform(0.5, 2.0))

        # Simulate fetching questions or other assets (if endpoints existed)
        # For now, we'll just hit the health check or re-fetch to simulate load
        for i in range(REQUESTS_PER_STUDENT):
            await asyncio.sleep(random.uniform(0.2, 1.0))
            
            # Alternate between simple fetch and code execution (heavy)
            if i % 2 == 0:
                path = f"/api/student/exams/{EXAM_ID}"
                async with session.get(f"{BASE_URL}{path}") as resp:
                    pass # print(f"Student {student_id}: Read Exam -> {resp.status}")
            else:
                # Simulate Code Execution
                path = f"/api/student/attempts/{student_id}/run" # Note: Needs valid attempt ID logic in real scenario
                # Simplified: Just hit a heavy endpoint or health check if auth is complex to mock here
                # In real test, you'd need to create an attempt first.
                # For this demo, we'll hit the healthz repeatedly to hammer the server
                async with session.get(f"{BASE_URL}/api/healthz") as resp:
                    pass

    except Exception as e:
        print(f"Student {student_id}: ERROR - {str(e)}")

async def main():
    print(f"🚀 Starting Load Test: {NUM_STUDENTS} students x {REQUESTS_PER_STUDENT} requests")
    async with aiohttp.ClientSession() as session:
        tasks = [simulate_student(session, i) for i in range(NUM_STUDENTS)]
        await asyncio.gather(*tasks)
    print("✅ Load Test Complete")

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\nTest stopped by user.")
