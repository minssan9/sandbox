
# list
test_list = []
test_list = list()
test_list(0)





# dict
test_dict = {'a':'apple'}
a = test_dict['a']

# dict 변경
test_dict['a'] = 'banana'

# dict 삭제
del( test_dict['a'])

# pop
test_dict.pop('a', 'default')

if 'a' in test_dict:
    value = test_dict('a')


row_list = []
row_data = {'id':1, 'limit_bal': 20000, 'sex':2,'edu':2,'marriage':1,'age':24, 'pay_0':2}
row_list.append(row_data)
row_data = {'id':2, 'limit_bal': 120000, 'sex':2,'edu':2,'marriage':2,'age':26, 'pay_0':-1}
row_list.append(row_data)
row_data = {'id':3, 'limit_bal': 90000, 'sex':2,'edu':2,'marriage':2,'age':34, 'pay_0':0}
row_list.append(row_data)
row_data = {'id':4, 'limit_bal': 50000, 'sex':2,'edu':2,'marriage':1,'age':37, 'pay_0':0}
row_list.append(row_data)

# list
row_list = [
{'id':1, 'limit_bal': 20000, 'sex':2,'edu':2,'marriage':1,'age':24, 'pay_0':2},
{'id':2, 'limit_bal': 120000, 'sex':2,'edu':2,'marriage':2,'age':26, 'pay_0':-1}
]

# dictionary
row_list = {
   1: {'id':1, 'limit_bal': 20000, 'sex':2,'edu':2,'marriage':1,'age':24, 'pay_0':2},
   2: {'id':2, 'limit_bal': 120000, 'sex':2,'edu':2,'marriage':2,'age':26, 'pay_0':-1}
}

keys = {'id':'id', 'limit_bal':'잔액'}
for key in keys:
    value = input(f"{keys[key]}을 입력하세요")

columns = {'id':'id', 'limit_bal':'잔액'}
persons=[]
while True:
    person = {}
    for key, value in columns.items():
        input_value = input(f"{value}의 값을 입력하세요.")
        if not input_value:
            print("no input data")
            break
        person[key] = input_value
    if not person:
        break
    persons.append(person)
print(persons)




import random as rnd
import pandas as pd
import random from randint

input_value = input(f"{value}의 년도를 입력하세요.")
year = int(input_value)
if len(input_value)==4:
    if input_value % 400 ==0 or (input_value % 4==0 and input_value % 100 !=0):
        print("윤년")
    else:
        print("윤년이 아님")


goalList = [3,2,7]
testList= []
s = 0
b = 0
for _ in range(3):
    value = input(f"숫자를 입력하세요")
    testList.append(value)

for i in goalList.count():
    if testList[i]==goalList.pop[i]:
        s += 1
    elif testList[i] in goalList:
        b += 1

print (s, "S", b, "B")
if s==3:
    goalList.clear()
    for _ in range(3):
        goalList.append(rnd.randint(1,5))


goal = rnd.randint(1,100)
count = 10
for i in count:
    if count == 0:
        print("기회 끝!")
    value = input(f"숫자를 입력하세요")
    if goal > value:
        print("up")
    elif goal < value:
        print("down")
    else:
        print("good!")
    count -= 1


import random as rnd

rnd.seed(1) # 똑같은 랜덤을 반복하기 위해서
rnd.randint(1,10)