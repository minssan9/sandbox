# import warnings
#
# import requests
# from openpyxl import Workbook
#
# warnings.filterwarnings('ignore')
#
#
# wb = Workbook()
# ws = wb.active
# ws.append(['일자','시가','저가', '고가','종가'])
#
# custom_headers = {
#     'referer' : 'https://www.daum.net',
#     'user-agent':'Mozilla'
# }
#
# page=1
# # max_page = input('수집할 페이지 수 : ')
# max_page = 10
# if max_page != '': max_page = int(max_page)
# while True:
#     url = f'https://finance.daum.net/api/quote/A035720/days?symbolCode=A035720&page={page}&perPage=100&pagination=true'
#     res = requests.get(url, headers=custom_headers)
#     if res.status_code == requests.codes.ok:
#         json = res.json()
#         print(json)
#         for daily in json['data']:
#             ws.append([
#                 daily['date'],
#                 daily['openingPrice'],
#                 daily['lowPrice'],
#                 daily['highPrice'],
#                 daily['tradePrice'],
#             ])
#             print(daily)
#         if max_page == '':
#             max_page = json['totalPages']
#         if json['totalPages'] > page and max_page >= page:
#             page = page + 1
#         else:
#             break
#
# wb.save('kakao.xlsx')


import pandas as pd
from matplotlib.text import get_rotation
from openpyxl import Workbook
import matplotlib.pyplot as plt
from pandas import Series, DataFrame
from matplotlib import font_manager

for f in font_manager.fontManager.ttflist:
    if 'Gothic' in f.name:
        print(f.name, f.fname)

plt.rc('font', family='Nanum Gothic')


df = pd.read_excel('kakao.xlsx')

wb = Workbook()
ws = wb.active

# print(df)
df['일자'] = df['일자'].str[:10]
# 1. 재할당
# 2. inplace=True

df['일자'] = pd.to_datetime(df['일자'])
df.set_index('일자', inplace=True)
df.sort_values(by= ['고가', '저가', '종가'], ascending=[False, False, True])
# df.sort_index(inplace=True)
df.head()

## 이동평균가격 구하기
## 종가 기준
print(sum(df['종가'][:5]) / 5)
## 1) 그룹핑  2) 윈도우 함수
df['MA5'] = df['종가'].rolling(window=5).mean()
df['MA10'] = df['종가'].rolling(window=10).mean()
df['MA20'] = df['종가'].rolling(window=20).mean()
df['MA30'] = df['종가'].rolling(window=30).mean()
df['MA60'] = df['종가'].rolling(window=60).mean()

# golden : 장 > 단, 단 > 장
# 단 : 5, 장 : 30
df['MA5_prev'] = df['MA5'].shift(1)
df.loc['2020-04-16']
df.head(6)

df['MA30_prev'] = df['MA30'].shift(1)

# today
df['MA5'] > df['MA30']
# yesterday
df['MA5_prev'] < df['MA30_prev']

df['is_golden'] = (df['MA5'] > df['MA30']) & (df['MA5_prev'] < df['MA30_prev'])

df['is_dead'] = (df['MA5'] < df['MA30']) & (df['MA5_prev'] > df['MA30_prev'])

#컬럼 지우기
del(df['MA10'])
df.drop('MA20', axis=1, inplace=True)

df.columns

df.reindex(columns=['종가','MA5', 'MA30'])

condition_golden = df['is_golden']
print(df[condition_golden])

condition_dead = df['is_dead']
print(df[condition_dead])

# 그래프에 표시하기
# plt.plot(df)
# plt.show()

plt.plot(df[condition_golden].index,
         df[condition_golden]['종가'],
         '^',  label='Godlden')

plt.plot(df[condition_golden])

plt.plot(df[condition_dead].index,
         df[condition_dead]['종가'],
         'v',  label='Dead')

plt.legend(loc='best')
plt.grid(True)
plt.title('title')
plt.xlabel('Date')
plt.xticks(rotation=30)
plt.ylabel('price')
plt.plot(df[condition_dead])
plt.show()

