import requests
from bs4 import  BeautifulSoup
import csv
f = open('lotto.csv', 'w', encoding='utf-8', newline='')
writer  = csv.writer(f)
writer.writerow(['회차','1','2','3','4','5','6','bonus'])


for count in range(0, 10):
    url = 'https://search.daum.net/search?w=tot&DA=LOT&rtmaxcoll=LOT&&q=' + str(966 - count) + '%ED%9A%8C%EC%B0%A8%20%EB%A1%9C%EB%98%90'
    res = requests.get(url)

    if res.status_code == requests.codes.ok:
        print('정상접속')
        html = BeautifulSoup(res.text, 'html.parser') #형태 변환 파싱
        balls = html.select('.ball')                # 전체 요소 찾기
        del(balls[6])
        balls = [int(ball.text) for ball in balls]
        balls.sort()
        writer.writerow([count] + balls)

        # html.select_one()                         # 맨 처음 하나만
    else:
        print('접속실패')

import csv
f = open('lotto.csv', 'r', encoding='utf-8')
lines = csv.reader(f)
for line in lines:
    print(line)