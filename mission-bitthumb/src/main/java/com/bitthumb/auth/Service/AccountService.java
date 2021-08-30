package com.bitthumb.auth.Service;

import com.bitthumb.auth.Domain.Account;
import com.bitthumb.auth.Dto.AccountDto;
import org.springframework.stereotype.Service;

import java.util.Optional;
/**
 * Created by vivie on 2017-06-08.
 */
@Service
public interface AccountService  {
	boolean isAccordPassword(Account account, String password);

	Account createAccount(Account accountDto);
	String login(Account account);
	String info(String token) throws Exception;
}
