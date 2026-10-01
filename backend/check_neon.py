import asyncio
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))
os.chdir(os.path.dirname(__file__))

from dotenv import load_dotenv
load_dotenv()

from prisma import Prisma

async def check():
    db = Prisma()
    await db.connect()
    students = await db.student.count()
    faculty = await db.faculty.count()
    subjects = await db.subject.count()
    print(f"✅ Connected to Neon!")
    print(f"   Students : {students}")
    print(f"   Faculty  : {faculty}")
    print(f"   Subjects : {subjects}")
    
    if students == 0:
        print("\n⚠️  No data yet — running seed now...")
        import database
        database.db = db
        await database.seed_if_empty()
        students = await db.student.count()
        print(f"✅ Seeded! Students now: {students}")
    else:
        print("\n✅ Database already seeded!")
    
    await db.disconnect()

asyncio.run(check())
