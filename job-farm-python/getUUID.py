# Python Program to compute 
# MAC address of host 
# using UUID module 
  
import uuid 
  
# printing the value of unique MAC 
# address using uuid and getnode() function  
print (hex(uuid.getnode())) 

print ("The MAC address in formatted way is : ", end="") 
print (':'.join(['{:02x}'.format((uuid.getnode() >> ele) & 0xff) 
for ele in range(0,8*6,8)][::-1])) 