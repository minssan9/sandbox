import warnings

import requests
from openpyxl import Workbook

warnings.filterwarnings('ignore')

# from matplotlib import pyplot as plt


wb = Workbook()
ws = wb.active
ws.append(['일자','시가','저가', '고가','종가'])

custom_headers = {
    'referer' : 'https://www.daum.net',
    'user-agent':'Mozilla'
}

page=1
# max_page = input('수집할 페이지 수 : ')
max_page = 1
if max_page != '': max_page = int(max_page)
while True:
    url = f'https://finance.daum.net/api/quote/A035720/days?symbolCode=A035720&page={page}&perPage=100&pagination=true'
    res = requests.get(url, headers=custom_headers)
    if res.status_code == requests.codes.ok:
        json = res.json()
        print(json)
        for daily in json['data']:
            ws.append([
                daily['date'],
                daily['openingPrice'],
                daily['lowPrice'],
                daily['highPrice'],
                daily['tradePrice'],
            ])
            print(daily)
        if max_page == '':
            max_page = json['totalPages']
        if json['totalPages'] > page and max_page >= page:
            page = page + 1
        else:
            break

wb.save('kakao.xlsx')

# from io import BytesIO
# from tempfile import NamedTemporaryFile
# tmp = NamedTemporaryFile()
# wb.save(tmp.name)
# output = BytesIO(tmp.read())
