#종합하자면, 일반적으로 무한루프를 돌며 사용자와 인터렉션 하는 GPIO 활용 프로그램의 특성상 아래와 같은 구조를 갖는 경우가 많다.

# 라이브러리 임포트
import RPi.GPIO as GPIO
...
# GPIO setup
GPIO.setmode(GPIO.BCM)
GPIO.setup(12, GPIO.IN)
GPIO.setup(18, GPIO.OUT)
...
# 메인 쓰레드
try:
    while 1:
        button = GPIO.input(12)
        ...
        GPIO.output(18, GPIO.HIGH)
        ...
# 반드시 클린업
finally:
    GPIO.cleanup()




########################################################
    # gpio-interrupt-test.py
# GPIO12에 입력이 들어오면 문장을 출력한다.

# 라이브러리 불러오기
import RPi.GPIO as GPIO
import time

# 스위치 눌렸을 때 콜백함수
def switchPressed(channel):
    print('channel %s pressed!!'%channel)

# GPIO setup
GPIO.setmode(GPIO.BCM)
GPIO.setup(12, GPIO.IN, pull_up_down=GPIO.PUD_DOWN)
# interrupt 선언
GPIO.add_event_detect(12, GPIO.RISING, callback=switchPressed)
# 메인 쓰레드
try:
    while 1:
        print(".")
        time.sleep(0.1)
finally:
    GPIO.cleanup()