# mode  : w, r, a
# mode+ : t, b
# utf-8 -> utf-mb4 ( 이모지 같이 지원)
# euc-kr
import random as rnd


numbers = list(range(1,46))
game_count = input(" game count ")
game_count = int(game_count)
f = open('test.txt', 'w', encoding='utf-8')

for _ in range(game_count):
    rnd.shuffle(numbers)
    # print(numbers[:6])
    game = numbers[:6]

# f.write("test message")
# f.write(str(123))

# f.write(str(numbers[:6]))
    print(game, file=f)

f.close()



f = open('test.txt', 'w', encoding='utf-8')
content = f.read()
print(content)

while True:
    line = f.readline()
    if not line:
        break
    print(line, end="")
f.seek(0)
# 전부다 한꺼번에 읽어서 한줄씩 단위로 구분해서
# 리스트 형태로 저장해줌
lines = f.readlines()
for line in lines:
    print(line, end="")

f.close()


content = []
while True:
    name = input("이름 : ")
    dept = input("부서 : ")
    if not name:
        break
    content.append({name, dept})

f = open("emp.txt", 'w', encoding='utf-8')
for line in content:
    print(line)
f.close()


