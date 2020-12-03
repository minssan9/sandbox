import urllib.request as urllib
import json  
 
class getCurrentStatus():    
    # 테스트용 Python Dictionary
    customer = {
        'id': 152352,
        'name': '강진수',
        'history': [
            {'date': '2015-03-11', 'item': 'iPhone'},
            {'date': '2016-02-23', 'item': 'Monitor'},
        ]
    }

    # JSON 디코딩
    dict = json.loads(customer)
    
    # Dictionary 데이타 체크
    print(dict['name'])
    for h in dict['history']:
        print(h['date'], h['item'])


    def main():
            url = "http://minssan9.iptime.org/"
            f = urllib.urlopen(url)
            body = f.info().getparam('Body')
            data = f.read().decode(body)
            f.close()
            print("\n : Fetch String from ", url)
    
    if __name__ == "__main__":
        main()