package com.bitthumb.auth;

import com.bitthumb.auth.Domain.Account;
import com.bitthumb.auth.Repository.AccountRepository;
import com.bitthumb.auth.Service.AccountService;
import org.junit.Assert;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.annotation.Rollback;
import org.springframework.test.context.junit4.SpringRunner;

import javax.transaction.Transactional;

@RunWith(SpringRunner.class)
@SpringBootTest
@Transactional
public class AuthTest {
    @Autowired
    AccountService accountService;

    @Autowired
    AccountRepository accountRepository;

    @Test
    public void 회원가입(){
        Account account1 = new Account();
        account1.setLoginId("minssan9@gmail.com");
        account1.setName("민상훈");
        account1.setPassword("1234");

        Account savedAccount = accountService.createAccount(account1);

        Assert.assertEquals(account1, savedAccount);
    }

    @Test
    @Rollback(false)
    public void 로그인 (){
        Account account1 = new Account();
        account1.setLoginId("minssan9@gmail.com");
        account1.setPassword("1234");

        String token = accountService.login(account1);

        Assert.assertNotNull(token);
    }

    @Test
    public void 사용자정보() throws Exception {
        Account account1 = accountRepository.findByLoginId("minssan9@gmail.com").get();;

        String token = accountService.info("4150149");

        Assert.assertEquals(account1.getToken(), token);
    }

}
