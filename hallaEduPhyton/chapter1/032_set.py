# set
empty_set = set()
test_set = {1,2,3}

import random as rnd

numbers = set()
while len(numbers) < 6:
    number = rnd.randint(1,45)
    numbers.add(number)
numbers= list(numbers)
numbers.sort()
print(numbers)

game_count = input("games count : ")
game_count = int(game_count)


for _ in range(game_count):
    numbers = list(range(1,46))
    game_numbers = []
    for _ in range(6) :
        rnd_index = rnd.randint(0,len(numbers) -1)
        number = numbers.pop(rnd_index)
        game_numbers.append(number)


numbers = list(range(1,46))
game_count = input(" game count ")
game_count = int(game_count)
for _ in range(game_count):
    rnd.shuffle(numbers)
    print(numbers[:6])
    #print(numbers[-6:])
