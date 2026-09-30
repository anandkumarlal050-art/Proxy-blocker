import asyncio
from database import connect, disconnect, get_faculty_by_email

async def main():
    await connect()
    fac = await get_faculty_by_email('turing@cs.edu')
    print("turing:", fac)
    fac2 = await get_faculty_by_email('alan@cs.edu')
    print("alan:", fac2)
    await disconnect()

if __name__ == "__main__":
    asyncio.run(main())
