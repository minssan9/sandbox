package com.bitthumb.auth.Service;

import com.bitthumb.auth.Domain.Account;
import com.bitthumb.auth.Repository.AccountRepository;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.common.exceptions.UnauthorizedUserException;
import org.springframework.stereotype.Service;

import javax.transaction.Transactional;
import java.time.LocalDateTime;
import java.util.Optional;

/**
 * Created by vivie on 2017-06-08.
 */
@Service
public class AccountServiceImpl implements AccountService  {

    private static final String NOTEXIST_EXCEPTION_MSG = "계정이 없습니다.";
    private static final String SIGNIN_EXCEPTION_MSG = "로그인정보가 일치하지 않습니다.";
    private static final String EMAIL_EXIST_EXCEPTION_MSG = "이미 계정이 존재합니다.";
    private static final String NICKNAME_EXIST_EXCEPTION_MSG = "이미 닉네임이 존재합니다.";

    @Autowired
    PasswordEncoder passwordEncoder;

    @Autowired
    AccountRepository accountRepository;

    public boolean isAccordPassword(Account account, String password) {
        return passwordEncoder.matches(account.getPassword(), password );
    }

    public Account createAccount(Account account) {
        account.setPassword(passwordEncoder.encode(account.getPassword()));
        return accountRepository.save(account);
    }

    @Override
    public String login(Account account) {
        String jwtString= "";
        Optional<Account> loadedAccount =
                accountRepository.findByLoginId(account.getLoginId());

        if (isAccordPassword(account, loadedAccount.get().getPassword())) {
            jwtString = Jwts.builder()
                    .setHeaderParam("typ", "JWT")
                    .setHeaderParam("issueDate", System.currentTimeMillis())
                    .setSubject(loadedAccount.get().getLoginId())
                    .signWith(SignatureAlgorithm.HS512, "bitthumb")
                    .compact();

            loadedAccount.get().setToken(jwtString);
            loadedAccount.get().setLastLoginDate(LocalDateTime.now());
            accountRepository.save(loadedAccount.get());
        }

        return jwtString;
    }

    @Override
    public String info(String token) {
        Optional<Account> account = accountRepository.findByToken(token);

        if (account.isPresent()){
            return account.get().getName() + "(" + account.get().getLoginId() + ") 님, 환영합니다." +
                            account.get().getLastLoginDate();

        }else{
            throw new UnauthorizedUserException("");
        }
    }


}
