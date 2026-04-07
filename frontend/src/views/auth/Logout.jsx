import React from 'react'

function Logout() {
  return (
    <>
      <section className="login-block">
        <div className="container">
            <div className="row">
                <div className="col-sm-12">
                    
                        <form className="md-float-material form-material">
                            <div className="text-center">
                                <img src="dashAssets/images/logo.png" alt="logo.png" />
                            </div>
                            <div className="auth-box card">
                                <div className="card-block">
                                    <div className="row m-b-20">
                                        <div className="col-md-12">
                                            <h3 className="text-center">Logout</h3>
                                        </div>
                                    </div>
                                   
                                    
                                    <div className="row m-t-25 text-left">
                                        <div className="col-12">
                                            
                                            <h3>You Have Been Logged Out</h3>
                                        </div>
                                    </div>
                                    <div className="row m-t-30">
                                        <div className="col-md-12">
                                            <button type="button" className="btn btn-primary btn-md btn-block waves-effect waves-light text-center m-b-20">Sign in</button>
                                        </div>
                                    </div>
                                    <hr/>
                                    <div className="row">
                                        <div className="col-md-10">
                                            <p className="text-inverse text-left m-b-0">Thank you.</p>
                                        </div>
                                        <div className="col-md-2">
                                            <img src="dashAssets/images/auth/Logo-small-bottom.png" alt="small-logo.png" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </form>
                </div>
            </div>
        </div>
    </section>
    </>
  )
}

export default Logout